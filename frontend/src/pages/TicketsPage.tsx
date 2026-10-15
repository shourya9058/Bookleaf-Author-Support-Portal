import React, { useEffect, useState } from 'react';
import {
  Card,
  Tabs,
  Tag,
  Typography,
  Space,
  Button,
  Input,
  Select,
  Row,
  Col,
  Alert,
  Spin,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  MessageOutlined,
  BookOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ArrowRightOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { Ticket, TicketStatus, TicketCategory, TicketPriority } from '../types';

const { Title, Text, Paragraph } = Typography;

export const TicketsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'urgent' | 'oldest' | 'newest'>('urgent');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const filters: any = {};
      if (statusFilter !== 'ALL') filters.status = statusFilter as TicketStatus;
      if (categoryFilter !== 'ALL') filters.category = categoryFilter as TicketCategory;
      if (priorityFilter !== 'ALL') filters.priority = priorityFilter as TicketPriority;
      if (sortBy) filters.sortBy = sortBy;
      if (searchTerm.trim()) filters.search = searchTerm.trim();

      const data = await api.tickets.getTickets(filters);
      setTickets(data);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title =
      user?.role === 'ADMIN'
        ? 'Support Tickets (Admin Queue) | BookLeaf Publishing'
        : 'Support Tickets | BookLeaf Publishing';
    fetchTickets();
  }, [statusFilter, categoryFilter, priorityFilter, sortBy, user]);

  const handleSearch = () => {
    fetchTickets();
  };

  const getStatusBadge = (status: TicketStatus) => {
    switch (status) {
      case 'OPEN':
        return <Tag color="blue" icon={<ClockCircleOutlined />}>Open</Tag>;
      case 'IN_PROGRESS':
        return <Tag color="warning" icon={<SyncOutlined spin />}>In Progress</Tag>;
      case 'RESOLVED':
        return <Tag color="success" icon={<CheckCircleOutlined />}>Resolved</Tag>;
      case 'CLOSED':
        return <Tag color="default">Closed</Tag>;
      default:
        return <Tag>{status}</Tag>;
    }
  };

  const getPriorityTag = (priority: string) => {
    switch (priority) {
      case 'CRITICAL':
        return <Tag color="error">CRITICAL</Tag>;
      case 'HIGH':
        return <Tag color="volcano">HIGH</Tag>;
      case 'MEDIUM':
        return <Tag color="gold">MEDIUM</Tag>;
      case 'LOW':
        return <Tag color="default">LOW</Tag>;
      default:
        return <Tag>{priority}</Tag>;
    }
  };

  const formatCategory = (cat: string) => {
    return cat
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const tabItems = [
    { key: 'ALL', label: 'All Queries' },
    { key: 'OPEN', label: 'Open' },
    { key: 'IN_PROGRESS', label: 'In Progress' },
    { key: 'RESOLVED', label: 'Resolved' },
    { key: 'CLOSED', label: 'Closed' },
  ];

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Title level={3} className="brand-font" style={{ margin: 0, color: '#1b4332' }}>
            {user?.role === 'ADMIN' ? 'All Support Tickets (Admin Queue)' : 'My Support Tickets'}
          </Title>
          <Paragraph type="secondary" style={{ margin: 0, fontSize: 13 }}>
            {user?.role === 'ADMIN'
              ? 'Manage incoming author inquiries across royalties, ISBN, quality, and distribution.'
              : 'Track resolution status, review BookLeaf ops responses, and follow up in real time.'}
          </Paragraph>
        </div>

        {user?.role === 'AUTHOR' && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            size="large"
            onClick={() => navigate('/tickets/new')}
            style={{ backgroundColor: '#1b4332', borderColor: '#1b4332', fontWeight: 600 }}
          >
            Raise a Ticket
          </Button>
        )}
      </div>

      {error && (
        <Alert
          type="error"
          message="Failed to load tickets"
          description={error}
          showIcon
          action={<Button onClick={fetchTickets}>Retry</Button>}
        />
      )}

      {/* Filter and Search Bar */}
      <Card style={{ borderRadius: 12, padding: '12px 16px' }} styles={{ body: { padding: 0 } }}>
        <div style={{ marginBottom: 12 }}>
          <Tabs
            activeKey={statusFilter}
            onChange={setStatusFilter}
            items={tabItems}
            style={{ marginBottom: 0 }}
          />
        </div>
        <Row gutter={[10, 10]} align="middle">
          <Col xs={24} sm={12} md={7}>
            <Input
              prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
              placeholder="Search by ticket #, subject, or author..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onPressEnter={handleSearch}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              value={categoryFilter}
              onChange={setCategoryFilter}
              style={{ width: '100%' }}
              options={[
                { value: 'ALL', label: 'All Categories' },
                { value: 'ROYALTY_AND_PAYMENTS', label: 'Royalty & Payments' },
                { value: 'ISBN_AND_METADATA', label: 'ISBN & Metadata' },
                { value: 'PRINTING_AND_QUALITY', label: 'Printing & Quality' },
                { value: 'DISTRIBUTION_AND_AVAILABILITY', label: 'Distribution & Availability' },
                { value: 'BOOK_STATUS_AND_PRODUCTION', label: 'Book Status & Production' },
                { value: 'GENERAL_INQUIRY', label: 'General Inquiry' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Select
              value={priorityFilter}
              onChange={setPriorityFilter}
              style={{ width: '100%' }}
              options={[
                { value: 'ALL', label: 'All Priorities' },
                { value: 'CRITICAL', label: 'Critical Priority' },
                { value: 'HIGH', label: 'High Priority' },
                { value: 'MEDIUM', label: 'Medium Priority' },
                { value: 'LOW', label: 'Low Priority' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              value={sortBy}
              onChange={(val) => setSortBy(val as 'urgent' | 'oldest' | 'newest')}
              style={{ width: '100%' }}
              options={[
                { value: 'urgent', label: 'Sort: Most Urgent First' },
                { value: 'oldest', label: 'Sort: Oldest Unresolved First' },
                { value: 'newest', label: 'Sort: Newest Submissions First' },
              ]}
            />
          </Col>
        </Row>
      </Card>

      {/* Ticket List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: 12, color: '#6b7280' }}>Loading tickets...</div>
        </div>
      ) : tickets.length === 0 ? (
        <Card style={{ borderRadius: 12, textAlign: 'center', padding: '40px 0' }}>
          <Empty
            description={
              <div>
                <Text strong style={{ fontSize: 16 }}>No support queries found</Text>
                <div style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>
                  {statusFilter !== 'ALL' || categoryFilter !== 'ALL'
                    ? 'No tickets match the selected filters.'
                    : 'You haven’t submitted any tickets yet.'}
                </div>
              </div>
            }
          >
            {user?.role === 'AUTHOR' && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => navigate('/tickets/new')}
                style={{ backgroundColor: '#1b4332', borderColor: '#1b4332', marginTop: 12 }}
              >
                Raise Your First Ticket
              </Button>
            )}
          </Empty>
        </Card>
      ) : (
        <Space direction="vertical" size={14} style={{ width: '100%' }}>
          {tickets.map((ticket) => (
            <Card
              key={ticket.id}
              hoverable
              onClick={() => navigate(`/tickets/${ticket.id}`)}
              style={{
                borderRadius: 12,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                border: '1px solid #e5e7eb',
              }}
              styles={{ body: { padding: '18px 22px' } }}
            >
              <Row justify="space-between" align="middle" gutter={[12, 12]}>
                <Col xs={24} md={18}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <Text strong style={{ color: '#1b4332', fontSize: 13, letterSpacing: 0.5 }}>
                      {ticket.ticketNumber}
                    </Text>
                    {getStatusBadge(ticket.status)}
                    {getPriorityTag(ticket.priority)}
                    <Tag color="geekblue" style={{ fontSize: 11 }}>
                      {formatCategory(ticket.category)}
                    </Tag>
                    {ticket.book ? (
                      <Tag icon={<BookOutlined />} color="purple" style={{ fontSize: 11 }}>
                        {ticket.book.title}
                      </Tag>
                    ) : (
                      <Tag color="default" style={{ fontSize: 11 }}>
                        General Inquiry
                      </Tag>
                    )}
                    {user?.role === 'ADMIN' && ticket.author && (
                      <Tag icon={<UserOutlined />} color="orange" style={{ fontSize: 11 }}>
                        {ticket.author.name} ({ticket.author.authorCode})
                      </Tag>
                    )}
                    {user?.role === 'ADMIN' && ticket.aiClassification && (
                      <Tag color="cyan" style={{ fontSize: 11 }}>
                        AI Suggestion: {ticket.aiClassification.replace(/_/g, ' ')}
                      </Tag>
                    )}
                    {user?.role === 'ADMIN' && ticket.assignedAdmin && (
                      <Tag color="blue" style={{ fontSize: 11 }}>
                        Assigned: {ticket.assignedAdmin.email}
                      </Tag>
                    )}
                  </div>

                  <Title level={5} style={{ margin: '0 0 6px', color: '#111827' }}>
                    {ticket.subject}
                  </Title>

                  <Paragraph
                    ellipsis={{ rows: 2 }}
                    style={{ color: '#4b5563', margin: '0 0 10px', fontSize: 13 }}
                  >
                    {ticket.description}
                  </Paragraph>

                  {ticket.latestReply && (
                    <div
                      style={{
                        background: '#f8fafc',
                        padding: '6px 12px',
                        borderRadius: 6,
                        fontSize: 12,
                        color: '#64748b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                      }}
                    >
                      <MessageOutlined style={{ color: '#0284c7' }} />
                      <span>
                        Latest update from{' '}
                        <strong>
                          {ticket.latestReply.sender.role === 'ADMIN' ? 'BookLeaf Support' : 'Author'}
                        </strong>
                        : &quot;{ticket.latestReply.content.slice(0, 80)}
                        {ticket.latestReply.content.length > 80 ? '...' : ''}&quot;
                      </span>
                    </div>
                  )}
                </Col>

                <Col xs={24} md={6} style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8 }}>
                    Raised on{' '}
                    {new Date(ticket.createdAt).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                  <Button
                    type="link"
                    icon={<ArrowRightOutlined />}
                    style={{ padding: 0, fontWeight: 600, color: '#1b4332' }}
                  >
                    View Conversation ({ticket.replyCount || 0} updates)
                  </Button>
                </Col>
              </Row>
            </Card>
          ))}
        </Space>
      )}
    </Space>
  );
};
