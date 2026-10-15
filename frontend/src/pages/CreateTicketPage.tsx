import React, { useEffect, useState } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Upload,
  Alert,
  Typography,
  Space,
  Tag,
  Divider,
} from 'antd';
import {
  InboxOutlined,
  SendOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { Book, TicketCategory, TicketPriority } from '../types';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

export const CreateTicketPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedBookId = searchParams.get('bookId');

  const [form] = Form.useForm();
  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'Raise a Ticket | BookLeaf Publishing';
    async function loadBooks() {
      try {
        if (user?.role === 'AUTHOR') {
          const res = await api.author.getBooks();
          setBooks(res.books);
          if (preselectedBookId) {
            form.setFieldsValue({ bookId: preselectedBookId });
          }
        }
      } catch (err: any) {
        console.error('Failed to load books for dropdown', err);
      } finally {
        setLoadingBooks(false);
      }
    }

    loadBooks();
  }, [user, preselectedBookId, form]);

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const ticket = await api.tickets.createTicket({
        subject: values.subject,
        description: values.description,
        bookId: values.bookId === 'GENERAL' || !values.bookId ? null : values.bookId,
        category: values.category as TicketCategory,
        priority: values.priority as TicketPriority,
      });

      // Redirect directly to the newly created ticket's conversation view!
      navigate(`/tickets/${ticket.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit support ticket.');
    } finally {
      setSubmitting(false);
    }
  };

  const categoryOptions = [
    { value: 'ROYALTY_AND_PAYMENTS', label: 'Royalty & Payments (Payouts, splits, sales mismatch)' },
    { value: 'ISBN_AND_METADATA', label: 'ISBN & Metadata Issues (Listing details, description, bio)' },
    { value: 'PRINTING_AND_QUALITY', label: 'Printing & Quality (Author copies, defects, binding)' },
    { value: 'DISTRIBUTION_AND_AVAILABILITY', label: 'Distribution & Availability (Amazon, Flipkart availability)' },
    { value: 'BOOK_STATUS_AND_PRODUCTION', label: 'Book Status & Production (Cover design, typesetting)' },
    { value: 'GENERAL_INQUIRY', label: 'General / Account Inquiry (Account details, contract, other)' },
  ];

  const priorityOptions = [
    { value: 'LOW', label: 'Low - General guidance / non-urgent question' },
    { value: 'MEDIUM', label: 'Medium - Standard inquiry' },
    { value: 'HIGH', label: 'High - Payout overdue or incorrect listing' },
    { value: 'CRITICAL', label: 'Critical - Severe defect / duplicate ISBN' },
  ];

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/tickets')}
        style={{ padding: 0, marginBottom: 16, color: '#1b4332' }}
      >
        Back to My Tickets
      </Button>

      <Card
        style={{
          borderRadius: 14,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ marginBottom: 24 }}>
          <Title level={3} className="brand-font" style={{ margin: '0 0 6px', color: '#1b4332' }}>
            Submit a Support Query
          </Title>
          <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
            Our operations and author relations team will review your query and respond directly.
          </Paragraph>
        </div>

        {errorMsg && (
          <Alert
            type="error"
            message="Submission Error"
            description={errorMsg}
            showIcon
            closable
            onClose={() => setErrorMsg(null)}
            style={{ marginBottom: 20 }}
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            bookId: preselectedBookId || 'GENERAL',
            category: 'GENERAL_INQUIRY',
            priority: 'MEDIUM',
          }}
          requiredMark="optional"
        >
          {/* Book Selection */}
          <Form.Item
            name="bookId"
            label={<Text strong>Select Related Book or Topic</Text>}
            tooltip="Choose which of your published titles this question is regarding, or select General Account Query."
            rules={[{ required: true, message: 'Please select a book or general inquiry' }]}
          >
            <Select
              loading={loadingBooks}
              size="large"
              placeholder="Choose a book or General inquiry"
              options={[
                {
                  value: 'GENERAL',
                  label: 'General / Account Level Query (Not specific to a book)',
                },
                ...books.map((b) => ({
                  value: b.id,
                  label: `${b.title} (${b.bookCode} • ISBN: ${b.isbn} • ${b.status})`,
                })),
              ]}
            />
          </Form.Item>

          {/* Category & Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
            <Form.Item
              name="category"
              label={<Text strong>Issue Category</Text>}
              rules={[{ required: true, message: 'Select an issue category' }]}
            >
              <Select size="large" options={categoryOptions} />
            </Form.Item>

            <Form.Item
              name="priority"
              label={<Text strong>Urgency / Priority</Text>}
              rules={[{ required: true, message: 'Select a priority level' }]}
            >
              <Select size="large" options={priorityOptions} />
            </Form.Item>
          </div>

          {/* Subject Line */}
          <Form.Item
            name="subject"
            label={<Text strong>Subject Line</Text>}
            rules={[
              { required: true, message: 'Please provide a clear subject' },
              { min: 3, message: 'Subject must be at least 3 characters' },
              { max: 200, message: 'Subject cannot exceed 200 characters' },
            ]}
          >
            <Input
              size="large"
              placeholder="e.g. Question regarding Q3 royalty transfer calculation"
            />
          </Form.Item>

          {/* Detailed Description */}
          <Form.Item
            name="description"
            label={<Text strong>Detailed Description</Text>}
            tooltip="Please describe the issue in detail, including dates, copy quantities, platform names, or order numbers."
            rules={[
              { required: true, message: 'Please provide details of your query' },
              { min: 10, message: 'Please write at least 10 characters so we can understand your issue' },
            ]}
          >
            <TextArea
              rows={5}
              placeholder="Provide as much context as possible. For royalty issues, please mention the quarter or month. For print defects, note the number of copies affected..."
            />
          </Form.Item>

          {/* Optional File Attachment UI */}
          <Form.Item
            label={
              <Space>
                <Text strong>Optional Attachments (UI Mock)</Text>
                <Tag color="default">Optional</Tag>
              </Space>
            }
          >
            <Dragger
              multiple={false}
              beforeUpload={() => false} // UI only demonstration, prevents actual upload POST
              style={{ padding: '16px 0', borderRadius: 8, background: '#fafafa' }}
            >
              <p className="ant-upload-drag-icon" style={{ marginBottom: 4 }}>
                <InboxOutlined style={{ color: '#1b4332', fontSize: 32 }} />
              </p>
              <p className="ant-upload-text" style={{ fontSize: 13, fontWeight: 500 }}>
                Click or drag photos of print defects or payment receipts here
              </p>
              <p className="ant-upload-hint" style={{ fontSize: 11, color: '#9ca3af' }}>
                Supports PNG, JPG, or PDF (UI only demonstration as per BRD specification)
              </p>
            </Dragger>
          </Form.Item>

          <Divider style={{ margin: '20px 0' }} />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <Button size="large" onClick={() => navigate('/tickets')}>
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              size="large"
              icon={<SendOutlined />}
              loading={submitting}
              style={{
                backgroundColor: '#1b4332',
                borderColor: '#1b4332',
                fontWeight: 600,
                padding: '0 28px',
              }}
            >
              Submit Ticket
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};
