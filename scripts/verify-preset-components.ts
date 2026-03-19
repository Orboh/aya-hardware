#!/usr/bin/env node

// 事前登録コンポーネントの妥当性を確認するスクリプト

import { prisma } from '../lib/prisma';
import { PRESET_COMPONENTS } from '../utils/data/presetComponents';

// 妥当性チェック項目
interface ValidationResult {
  partName: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function validateComponent(
  component: Record<string, any>,
): ValidationResult {
  const result: ValidationResult = {
    partName: component.partName as string,
    valid: true,
    errors: [],
    warnings: [],
  };

  // 1. 必須フィールドのチェック
  if (!component.partName) {
    result.errors.push('Part name is missing');
    result.valid = false;
  }

  if (!component.category) {
    result.errors.push('Category is missing');
    result.valid = false;
  }

  if (!component.manufacturer) {
    result.errors.push('Manufacturer is missing');
    result.valid = false;
  }

  const spec = component.specification;
  if (!spec) {
    result.errors.push('Specification is missing');
    result.valid = false;
    return result;
  }

  // 2. 電圧仕様のチェック
  if (!spec.voltage?.operating || spec.voltage.operating.length === 0) {
    result.errors.push('Operating voltage is missing');
    result.valid = false;
  } else {
    // 電圧値の妥当性チェック
    spec.voltage.operating.forEach((v: string) => {
      const voltage = parseFloat(v.replace('V', ''));
      if (isNaN(voltage) || voltage < 0 || voltage > 24) {
        result.warnings.push(`Unusual voltage value: ${v}`);
      }
    });
  }

  // 3. 通信プロトコルのチェック
  if (
    !spec.communication?.protocols ||
    spec.communication.protocols.length === 0
  ) {
    result.errors.push('Communication protocols are missing');
    result.valid = false;
  }

  // 4. I/Oピンのチェック
  if (spec.io) {
    if (typeof spec.io.digital !== 'number' || spec.io.digital < 0) {
      result.warnings.push('Invalid digital pin count');
    }
    if (typeof spec.io.analog !== 'number' || spec.io.analog < 0) {
      result.warnings.push('Invalid analog pin count');
    }
    if (
      spec.io.pwm !== undefined &&
      (typeof spec.io.pwm !== 'number' || spec.io.pwm < 0)
    ) {
      result.warnings.push('Invalid PWM pin count');
    }

    // ピン数の妥当性チェック
    const totalPins = (spec.io.digital || 0) + (spec.io.analog || 0);
    if (totalPins > 100) {
      result.warnings.push(`Unusually high pin count: ${totalPins}`);
    }
  } else {
    result.errors.push('I/O specification is missing');
    result.valid = false;
  }

  // 5. メモリ仕様のチェック（マイコンの場合）
  if (component.category === 'microcontroller') {
    if (!spec.memory?.flash && !spec.memory?.ram) {
      result.warnings.push(
        'Memory specifications are missing for microcontroller',
      );
    }
  }

  // 6. クロック周波数のチェック
  if (spec.clock?.frequency) {
    const freq = spec.clock.frequency.toLowerCase();
    if (!freq.includes('mhz') && !freq.includes('ghz')) {
      result.warnings.push('Clock frequency unit is missing or invalid');
    }
  }

  // 7. コネクタのチェック
  if (spec.communication?.connectors) {
    spec.communication.connectors.forEach((conn: Record<string, any>) => {
      if (!conn.type) {
        result.warnings.push('Connector type is missing');
      }
      if (typeof conn.count !== 'number' || conn.count < 0) {
        result.warnings.push(`Invalid connector count for ${conn.type}`);
      }
    });
  }

  // 8. 消費電力のチェック
  if (spec.power?.consumption) {
    const typical = spec.power.consumption.typical;
    const max = spec.power.consumption.max;

    if (typeof typical !== 'number' || typical < 0) {
      result.warnings.push('Invalid typical power consumption');
    }
    if (typeof max !== 'number' || max < 0) {
      result.warnings.push('Invalid max power consumption');
    }
    if (typical > max) {
      result.warnings.push('Typical power exceeds max power');
    }
    if (max > 10000) {
      result.warnings.push(`Unusually high power consumption: ${max}mA`);
    }
  }

  return result;
}

async function main() {
  console.log('🔍 Validating preset components...\n');

  // ローカルデータの検証
  console.log('=== Validating Local Data ===\n');
  const localResults: ValidationResult[] = [];

  for (const component of PRESET_COMPONENTS) {
    const result = validateComponent(component);
    localResults.push(result);

    if (!result.valid) {
      console.log(`❌ ${result.partName}`);
      result.errors.forEach((err) => console.log(`   ERROR: ${err}`));
    } else if (result.warnings.length > 0) {
      console.log(`⚠️  ${result.partName}`);
      result.warnings.forEach((warn) => console.log(`   WARN: ${warn}`));
    } else {
      console.log(`✅ ${result.partName}`);
    }
  }

  // データベースのデータを確認
  console.log('\n=== Checking Database Data ===\n');

  try {
    const dbComponents = await prisma.componentSpecification.findMany({
      where: { isPreset: true },
    });

    console.log(`Found ${dbComponents.length} components in database\n`);

    // データベースとローカルの比較
    for (const localComp of PRESET_COMPONENTS) {
      const dbComp = dbComponents.find(
        (d) => d.partName === localComp.partName,
      );

      if (!dbComp) {
        console.log(`⚠️  ${localComp.partName} - Not in database`);
      } else {
        // 簡単な比較
        const localSpec = JSON.stringify(localComp.specification);
        const dbSpec = JSON.stringify(dbComp.specification);

        if (localSpec === dbSpec) {
          console.log(`✅ ${localComp.partName} - Matches database`);
        } else {
          console.log(`⚠️  ${localComp.partName} - Differs from database`);

          // 差分の詳細を表示（オプション）
          if (process.argv.includes('--verbose')) {
            console.log('   Local:', localSpec.substring(0, 100) + '...');
            console.log('   DB:   ', dbSpec.substring(0, 100) + '...');
          }
        }
      }
    }

    // データベースにあってローカルにないもの
    console.log('\n=== Database-only Components ===\n');
    for (const dbComp of dbComponents) {
      const localComp = PRESET_COMPONENTS.find(
        (l) => l.partName === dbComp.partName,
      );
      if (localComp) continue;
      console.log(`⚠️  ${dbComp.partName} - Not in local data`);
    }
  } catch (error) {
    console.error('Error checking database data:', error);
  }
}

main();