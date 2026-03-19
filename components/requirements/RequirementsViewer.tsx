import React, { useState, useEffect } from 'react';
import {
  RequirementsDocument,
  RequirementStatus,
  EditorContent,
  RequirementsSection,
} from '@/types/requirements';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import RichTextEditor from '@/components/editor/RichTextEditor';
import StructuredView from '@/components/requirements/StructuredView';
import ReviewMode from '@/components/requirements/ReviewMode';
import { RequirementsValidator } from '@/lib/validators/requirementsValidator';
import { convertMarkdownToTiptap } from '@/lib/utils/markdownToTiptap';
import {
  FileText,
  Edit,
  Eye,
  Check,
  Clock,
  AlertCircle,
  History,
  Save,
  CheckCircle2,
  AlertTriangle,
  Info,
  Trash2,
  X,
  CheckCircle,
} from 'lucide-react';

interface RequirementsViewerProps {
  requirementId: string;
  mode?: 'view' | 'edit' | 'review';
  onStatusChange?: (status: RequirementStatus) => void;
  onEdit?: () => void;
  onApprove?: (requirementId: string, document: RequirementsDocument) => void;
  onDelete?: () => void;
}

export default function RequirementsViewer({
  requirementId,
  mode = 'view',
  onStatusChange,
  onEdit,
  onApprove,
  onDelete,
}: RequirementsViewerProps) {
  const [document, setDocument] = useState<RequirementsDocument | null>(null);
  const [loading, setLoading] = useState(true);
  const [completeness, setCompleteness] = useState<{
    overall: number;
    sections: RequirementsSection[];
  }>({ overall: 0, sections: [] });
  const [activeTab, setActiveTab] = useState('document');
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState<EditorContent | null>(
    null,
  );
  const [validationResult, setValidationResult] = useState<ReturnType<
    typeof RequirementsValidator.prototype.runValidation
  > | null>(null);
  const [approvalHistory, setApprovalHistory] = useState<
    Array<{
      id: string;
      timestamp: string;
      user: string;
      action: string;
      comment?: string;
    }>
  >([]);
  const [isApproving, setIsApproving] = useState(false);
  const [isUnapproving, setIsUnapproving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchRequirements();
    fetchCompleteness();
    fetchApprovalHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requirementId]);

  const fetchRequirements = async () => {
    try {
      setLoading(true);
      console.log(
        '📄 [RequirementsViewer] Fetching requirements for ID:',
        requirementId,
      );
      const response = await fetch(`/api/requirements/${requirementId}`);
      console.log('📄 [RequirementsViewer] Response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log(
          '📄 [RequirementsViewer] Successfully loaded document:',
          data,
        );
        
        // Handle content format conversion if needed
        if (data.content && typeof data.content === 'string') {
          console.log('📄 [RequirementsViewer] Converting markdown to TipTap format');
          data.content = convertMarkdownToTiptap(data.content);
        }
        
        setDocument(data);
      } else if (response.status === 401) {
        console.error(
          '📄 [RequirementsViewer] Authentication error - user not logged in',
        );
        setDocument(null);
      } else if (
        response.status === 404 &&
        requirementId.startsWith('req-mock-')
      ) {
        // For mock documents, use default data
        const mockDocument: RequirementsDocument = {
          id: requirementId,
          projectId: 'default-project',
          userId: 'user-123',
          title: 'Robotic Arm Requirements',
          content: {
            type: 'doc',
            content: [
              {
                type: 'heading',
                attrs: { level: 1 },
                content: [
                  { type: 'text', text: 'Robotic Arm Requirements Document' },
                ],
              },
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'This document defines the requirements for a robotic arm system.',
                  },
                ],
              },
            ],
          },
          contentText: `# Robotic Arm Requirements Document

## 1. System Purpose and Overview
This document defines the requirements for a robotic arm system. The system aims to provide reliable and efficient operation for the intended application.

## 2. Functional Requirements
- 6-axis movement capability
- Precise positioning and control
- Safety and operational features
- User interface requirements

## 3. Non-functional Requirements
- Payload capacity: 5kg maximum
- Positioning accuracy: ±0.1mm
- Operating// temperature: 0°C to 45°C
- Safety compliance requirements

## 4. Constraints
- Maximum reach: 800mm
- Power consumption: 100W maximum
- Cost target: Under $10,000
- Industrial safety standards compliance

## 5. Hardware Requirements
- Servo motors for each axis
- Position sensors and encoders
- Safety systems and emergency stops
- Control system and processing unit

## 6. Software Requirements
- Motion control software
- User interface software
- Safety monitoring systems
- Programming interface for automation

## 7. Interface Requirements
- Ethernet communication interface
- Emergency stop connections
- Power supply interface
- Tool mounting interface`,
          status: 'DRAFT',
          version: 1,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setDocument(mockDocument);
      } else {
        console.error('📄 [RequirementsViewer] Failed to load document');
        setDocument(null);
      }
    } catch (error) {
      console.error('📄 [RequirementsViewer] Error fetching requirements:', error);
      setDocument(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompleteness = async () => {
    // Implementation for fetching completeness
  };

  const fetchApprovalHistory = async () => {
    // Implementation for fetching approval history
  };

  const handleApprove = async () => {
    if (!document || !onApprove) return;
    setIsApproving(true);
    try {
      await onApprove(requirementId, document);
    } catch (error) {
      console.error('📄 [RequirementsViewer] Error approving document:', error);
    } finally {
      setIsApproving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    setIsDeleting(true);
    try {
      await onDelete();
    } catch (error) {
      console.error('📄 [RequirementsViewer] Error deleting document:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="document">Document</TabsTrigger>
          <TabsTrigger value="structured">Structured View</TabsTrigger>
          <TabsTrigger value="review">Review Mode</TabsTrigger>
        </TabsList>
        <TabsContent value="document">
          {loading ? (
            <div>Loading...</div>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{document?.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <RichTextEditor content={document?.content} readOnly={!isEditing} />
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="structured">
          <StructuredView document={document} />
        </TabsContent>
        <TabsContent value="review">
          <ReviewMode document={document} />
        </TabsContent>
      </Tabs>
      <div>
        <Button onClick={handleApprove} disabled={isApproving}>
          Approve
        </Button>
        <Button onClick={handleDelete} disabled={isDeleting}>
          Delete
        </Button>
      </div>
    </div>
  );
}