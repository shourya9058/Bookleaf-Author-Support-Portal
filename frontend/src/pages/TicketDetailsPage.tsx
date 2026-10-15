import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  Card,
  Typography,
  Tag,
  Button,
  Input,
  Space,
  Avatar,
  Alert,
  Spin,
  Select,
  Switch,
  Row,
  Col,
  Tooltip,
} from 'antd';
import {
  ArrowLeftOutlined,
  SendOutlined,
  CustomerServiceOutlined,
  UserOutlined,
  LockOutlined,
  BookOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  SyncOutlined,
  ReloadOutlined,
  SafetyCertificateFilled,
  RobotOutlined,
  ThunderboltOutlined,
  CheckOutlined,
  CopyOutlined,
  BulbOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { Ticket, TicketStatus } from '../types';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

export const TicketDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [sendingReply, setSendingReply] = useState<boolean>(false);
  const [isInternalNote, setIsInternalNote] = useState<boolean>(false);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [assigningTicket, setAssigningTicket] = useState<boolean>(false);
  const [lastPolledAt, setLastPolledAt] = useState<Date>(new Date());

  // Admin AI Intelligence state
  const [generatingDraft, setGeneratingDraft] = useState<boolean>(false);
  const [classifying, setClassifying] = useState<boolean>(false);
  const [applyingSuggestions, setApplyingSuggestions] = useState<boolean>(false);
  const [aiDraft, setAiDraft] = useState<string | null>(null);
  const [aiSource, setAiSource] = useState<string | null>(null);
  const [aiPolicies, setAiPolicies] = useState<string[]>([]);
  const [aiActionMessage, setAiActionMessage] = useState<{ type: 'success' | 'info' | 'error'; text: string } | null>(null);

  // Ref to track component mount state
  const isMountedRef = useRef<boolean>(true);
  // Ref to track last message count to prevent duplicate re-render work
  const lastMessageIdsRef = useRef<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicketDetails = useCallback(
    async (isPolling: boolean = false) => {
      if (!id) return;

      if (!isPolling) setLoading(true);

      try {
        const fetchedTicket = await api.tickets.getTicket(id);

        if (!isMountedRef.current) return;

        setTicket((prev) => {
          const currentIds = new Set(fetchedTicket.messages?.map((m) => m.id) || []);
          const hasNewMessages =
            currentIds.size !== lastMessageIdsRef.current.size ||
            ![...currentIds].every((msgId) => lastMessageIdsRef.current.has(msgId));

          if (hasNewMessages || !isPolling || fetchedTicket.status !== prev?.status) {
            lastMessageIdsRef.current = currentIds;
            return fetchedTicket;
          }
          return prev;
        });

        setLastPolledAt(new Date());
        setError(null);
      } catch (err: any) {
        if (!isMountedRef.current) return;
        if (!isPolling) {
          setError(err.message || 'Failed to load ticket details.');
        }
      } finally {
        if (isMountedRef.current && !isPolling) {
          setLoading(false);
        }
      }
    },
    [id]
  );

  // Initial load and polling setup with automatic cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    fetchTicketDetails(false);

    // Polling interval at 5 seconds
    const POLL_INTERVAL_MS = 5000;
    const intervalId = setInterval(() => {
      fetchTicketDetails(true);
    }, POLL_INTERVAL_MS);

    // Cleanup on unmount to prevent memory leaks and unnecessary requests
    return () => {
      isMountedRef.current = false;
      clearInterval(intervalId);
    };
  }, [id]);

  useEffect(() => {
    if (ticket) {
      document.title = `${ticket.ticketNumber} • ${ticket.subject} | BookLeaf Publishing`;
    } else {
      document.title = 'Ticket Details | BookLeaf Publishing';
    }
  }, [ticket]);

  const handleSendReply = async () => {
    if (!id || !replyText.trim()) return;

    setSendingReply(true);
    try {
      const newMessage = await api.tickets.addMessage(id, {
        content: replyText.trim(),
        isInternal: user?.role === 'ADMIN' ? isInternalNote : false,
      });

      setReplyText('');
      setIsInternalNote(false);

      // Append new message immediately and deduplicate
      setTicket((prev) => {
        if (!prev) return null;
        const existingMessages = prev.messages || [];
        if (existingMessages.some((m) => m.id === newMessage.id)) {
          return prev;
        }
        return {
          ...prev,
          status:
            user?.role === 'ADMIN' && !newMessage.isInternal && prev.status === 'OPEN'
              ? 'IN_PROGRESS'
              : prev.status,
          messages: [...existingMessages, newMessage],
        };
      });

      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      alert(err.message || 'Failed to send message.');
    } finally {
      setSendingReply(false);
    }
  };

  const handleGenerateDraft = async () => {
    if (!id) return;
    setGeneratingDraft(true);
    setAiActionMessage(null);
    try {
      const res = await api.tickets.generateAiDraft(id);
      if (res.success && res.draft) {
        setAiDraft(res.draft);
        setAiSource(res.source || null);
        setAiPolicies(res.relevantPolicies || []);
        setAiActionMessage({
          type: 'success',
          text: `AI response draft generated successfully (${res.source === 'live' ? 'Live OpenAI' : 'Mock AI • Policy-Grounded'}). Review or edit before sending!`,
        });
      } else {
        setAiActionMessage({
          type: 'error',
          text: res.error || 'AI drafting service unavailable.',
        });
      }
    } catch (err: any) {
      setAiActionMessage({
        type: 'error',
        text: err.message || 'Failed to generate AI draft.',
      });
    } finally {
      setGeneratingDraft(false);
    }
  };

  const handleReclassify = async () => {
    if (!id) return;
    setClassifying(true);
    setAiActionMessage(null);
    try {
      const res = await api.tickets.classifyTicket(id);
      if (res.success) {
        if (res.ticket) {
          setTicket((prev) => (prev ? { ...prev, ...res.ticket } : null));
        } else if (res.category && res.priority) {
          setTicket((prev) =>
            prev
              ? {
                  ...prev,
                  aiClassification: res.category ?? prev.aiClassification,
                  aiPriority: res.priority ?? prev.aiPriority,
                  aiConfidence: res.confidence ?? prev.aiConfidence,
                  aiReasoning: res.reasoning ?? prev.aiReasoning,
                }
              : null
          );
        }
        setAiActionMessage({
          type: 'success',
          text: `AI classification completed: ${res.category} (${res.priority} Priority).`,
        });
      } else {
        setAiActionMessage({
          type: 'error',
          text: res.error || 'AI classification service unavailable.',
        });
      }
    } catch (err: any) {
      setAiActionMessage({
        type: 'error',
        text: err.message || 'Failed to re-classify ticket.',
      });
    } finally {
      setClassifying(false);
    }
  };

  const handleApplyAiSuggestions = async () => {
    if (!id) return;
    setApplyingSuggestions(true);
    setAiActionMessage(null);
    try {
      const updated = await api.tickets.applyAiSuggestions(id);
      if (updated) {
        setTicket((prev) => (prev ? { ...prev, ...updated } : updated));
        setAiActionMessage({
          type: 'success',
          text: `Applied AI recommendations: Category set to ${updated.category} and Priority set to ${updated.priority}.`,
        });
      }
    } catch (err: any) {
      setAiActionMessage({
        type: 'error',
        text: err.message || 'Failed to apply AI suggestions.',
      });
    } finally {
      setApplyingSuggestions(false);
    }
  };

  const handleAssignToSelf = async () => {
    if (!id || !user?.id) return;
    setAssigningTicket(true);
    try {
      const updated = await api.tickets.updateTicket(id, { assignedAdminId: user.id });
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              assignedAdminId: updated.assignedAdminId,
              assignedAdmin: updated.assignedAdmin || { id: user.id, email: user.email },
            }
          : null
      );
    } catch (err: any) {
      alert(err.message || 'Failed to assign ticket.');
    } finally {
      setAssigningTicket(false);
    }
  };

  const handleUseDraftInReply = () => {
    const textToInsert = aiDraft || ticket?.aiDraftResponse;
    if (textToInsert) {
      setReplyText(textToInsert);
      setIsInternalNote(false);
      // Smooth scroll to the reply box
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    }
  };

  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!id) return;
    setUpdatingStatus(true);
    try {
      const updatedTicket = await api.tickets.updateTicket(id, { status: newStatus });
      setTicket((prev) => (prev ? { ...prev, status: updatedTicket.status } : null));
    } catch (err: any) {
      alert(err.message || 'Failed to update ticket status.');
    } finally {
      setUpdatingStatus(false);
    }
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

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: '#6b7280' }}>Loading ticket conversation...</div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div style={{ maxWidth: 840, margin: '0 auto' }}>
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/tickets')}
          style={{ padding: 0, marginBottom: 16, color: '#1b4332' }}
        >
          Back to Tickets
        </Button>
        <Alert
          type="error"
          message="Ticket Access Restricted or Not Found"
          description={error || 'This ticket does not exist or you do not have permission to view it.'}
          showIcon
          action={
            <Button type="primary" onClick={() => navigate('/tickets')}>
              Return to My Tickets
            </Button>
          }
        />
      </div>
    );
  }

  const messages = ticket.messages || [];

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      {/* Top Navigation & Status */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <Button
          type="link"
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/tickets')}
          style={{ padding: 0, color: '#1b4332', fontWeight: 600 }}
        >
          Back to Tickets Queue
        </Button>

        {/* Live Polling Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="live-pulse-dot" />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Live updates active (polling 5s)
          </Text>
          <Tooltip title={`Last synced: ${lastPolledAt.toLocaleTimeString()}`}>
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => fetchTicketDetails(false)}
            />
          </Tooltip>
        </div>
      </div>

      {/* Ticket Header Card */}
      <Card
        style={{
          borderRadius: 14,
          marginBottom: 20,
          border: '1px solid #e5e7eb',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}
      >
        <Row justify="space-between" align="top" gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <Text strong style={{ fontSize: 14, color: '#1b4332', letterSpacing: 0.5 }}>
                {ticket.ticketNumber}
              </Text>
              {getStatusBadge(ticket.status)}
              <Tag color="geekblue">
                {ticket.category.replace(/_/g, ' ')}
              </Tag>
              <Tag color={ticket.priority === 'CRITICAL' ? 'error' : ticket.priority === 'HIGH' ? 'volcano' : 'gold'}>
                {ticket.priority} Priority
              </Tag>
            </div>

            <Title level={4} style={{ margin: '0 0 8px', color: '#111827' }}>
              {ticket.subject}
            </Title>

            <div style={{ fontSize: 12, color: '#6b7280' }}>
              Raised by <strong>{ticket.author?.name || 'Author'}</strong> ({ticket.author?.authorCode}) on{' '}
              {new Date(ticket.createdAt).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </div>
          </Col>

          {/* Admin Status Lifecycle & Assignment Controls */}
          <Col xs={24} md={10} style={{ textAlign: 'right' }}>
            {user?.role === 'ADMIN' ? (
              <Space direction="vertical" align="end" size={8}>
                <div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#4b5563', marginRight: 8 }}>
                    Status:
                  </span>
                  <Select
                    value={ticket.status}
                    loading={updatingStatus}
                    onChange={handleStatusChange}
                    style={{ width: 140 }}
                    options={[
                      { value: 'OPEN', label: 'Open' },
                      { value: 'IN_PROGRESS', label: 'In Progress' },
                      { value: 'RESOLVED', label: 'Resolved' },
                      { value: 'CLOSED', label: 'Closed' },
                    ]}
                  />
                </div>
                <div>
                  {ticket.assignedAdmin ? (
                    <div style={{ fontSize: 12, color: '#4b5563', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>Owner:</span>
                      <Tag color="blue">{ticket.assignedAdmin.email}</Tag>
                      {ticket.assignedAdmin.id !== user?.id && (
                        <Button
                          size="small"
                          type="link"
                          loading={assigningTicket}
                          onClick={handleAssignToSelf}
                          style={{ padding: 0 }}
                        >
                          Reassign to Me
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button
                      size="small"
                      type="dashed"
                      loading={assigningTicket}
                      onClick={handleAssignToSelf}
                    >
                      Assign Ticket to Myself
                    </Button>
                  )}
                </div>
              </Space>
            ) : (
              ticket.status !== 'CLOSED' && (
                <Button
                  size="small"
                  onClick={() => handleStatusChange('CLOSED')}
                  style={{ fontSize: 12 }}
                >
                  Close Ticket
                </Button>
              )
            )}
          </Col>
        </Row>

        {/* Associated Book Pill */}
        {ticket.book && (
          <div
            style={{
              marginTop: 14,
              padding: '10px 14px',
              backgroundColor: '#f3fbf6',
              borderRadius: 8,
              border: '1px solid #d8f3dc',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              fontSize: 13,
            }}
          >
            <BookOutlined style={{ color: '#1b4332', fontSize: 16 }} />
            <div>
              Regarding Title: <strong>{ticket.book.title}</strong> • ISBN:{' '}
              <code>{ticket.book.isbn}</code> • Status: <Tag color="green">{ticket.book.status}</Tag>
            </div>
          </div>
        )}
      </Card>

      {/* Admin AI Intelligence & Policy Assistant Panel */}
      {user?.role === 'ADMIN' && (
        <Card
          style={{
            borderRadius: 14,
            marginBottom: 20,
            border: '1px solid #bbf7d0',
            background: 'linear-gradient(180deg, #f0fdf4 0%, #ffffff 100%)',
            boxShadow: '0 4px 14px rgba(27,67,50,0.06)',
          }}
          styles={{ body: { padding: '20px 22px' } }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <RobotOutlined style={{ fontSize: 20, color: '#166534' }} />
              <Title level={5} style={{ margin: 0, color: '#14532d' }}>
                AI Ticket Intelligence & Grounded Drafting
              </Title>
              <Tag color="cyan" style={{ fontSize: 11, fontWeight: 600 }}>
                Admin Operations
              </Tag>
              {ticket.aiClassification ? (
                <Tag color="green" icon={<CheckOutlined />}>
                  Classified
                </Tag>
              ) : (
                <Tag color="default">Pending Classification</Tag>
              )}
            </div>

            <Space wrap>
              <Button
                size="small"
                icon={<ThunderboltOutlined />}
                loading={classifying}
                onClick={handleReclassify}
              >
                Re-classify Ticket
              </Button>
              <Button
                type="primary"
                size="small"
                icon={<RobotOutlined />}
                loading={generatingDraft}
                onClick={handleGenerateDraft}
                style={{ backgroundColor: '#1b4332', borderColor: '#1b4332' }}
              >
                {aiDraft || ticket.aiDraftResponse ? 'Regenerate AI Draft' : 'Generate KB Draft Reply'}
              </Button>
            </Space>
          </div>

          {/* Action Notification Alert */}
          {aiActionMessage && (
            <Alert
              type={aiActionMessage.type}
              message={aiActionMessage.text}
              showIcon
              closable
              onClose={() => setAiActionMessage(null)}
              style={{ marginBottom: 14 }}
            />
          )}

          {/* AI Suggestions Summary */}
          <div
            style={{
              padding: '12px 16px',
              backgroundColor: '#ffffff',
              borderRadius: 10,
              border: '1px solid #e2e8f0',
              marginBottom: 14,
            }}
          >
            <Row gutter={[16, 12]} align="middle">
              <Col xs={24} sm={8}>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                  Suggested Category
                </div>
                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Tag color="geekblue" style={{ fontSize: 12, padding: '2px 8px' }}>
                    {ticket.aiClassification ? ticket.aiClassification.replace(/_/g, ' ') : 'Not yet analyzed'}
                  </Tag>
                  {ticket.aiClassification && ticket.aiClassification !== ticket.category && (
                    <Tag color="volcano" style={{ fontSize: 10 }}>Current: {ticket.category}</Tag>
                  )}
                </div>
              </Col>

              <Col xs={24} sm={8}>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>
                  Recommended Priority
                </div>
                <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Tag
                    color={
                      ticket.aiPriority === 'CRITICAL'
                        ? 'error'
                        : ticket.aiPriority === 'HIGH'
                        ? 'volcano'
                        : 'gold'
                    }
                    style={{ fontSize: 12, padding: '2px 8px' }}
                  >
                    {ticket.aiPriority || 'Standard'}
                  </Tag>
                  {ticket.aiConfidence && (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      ({Math.round(ticket.aiConfidence * 100)}% confidence)
                    </Text>
                  )}
                </div>
              </Col>

              <Col xs={24} sm={8} style={{ textAlign: 'right' }}>
                {ticket.aiClassification &&
                  (ticket.aiClassification !== ticket.category || ticket.aiPriority !== ticket.priority) && (
                    <Button
                      size="small"
                      type="dashed"
                      loading={applyingSuggestions}
                      icon={<CheckOutlined />}
                      onClick={handleApplyAiSuggestions}
                    >
                      Apply AI Recommendations
                    </Button>
                  )}
              </Col>
            </Row>

            {/* AI Reasoning Narrative */}
            {ticket.aiReasoning && (
              <div
                style={{
                  marginTop: 10,
                  paddingTop: 10,
                  borderTop: '1px dashed #e2e8f0',
                  fontSize: 12,
                  color: '#475569',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 6,
                }}
              >
                <BulbOutlined style={{ color: '#d97706', marginTop: 2 }} />
                <div>
                  <strong>AI Analysis Reasoning:</strong> {ticket.aiReasoning}
                </div>
              </div>
            )}
          </div>

          {/* AI Response Draft Preview Box */}
          {(aiDraft || ticket.aiDraftResponse) && (
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: 10,
                padding: '14px 16px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 10,
                  flexWrap: 'wrap',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Text strong style={{ fontSize: 13, color: '#0f172a' }}>
                    Knowledge-Base Grounded Draft Response
                  </Text>
                  <Tag color={aiSource === 'live' ? 'green' : 'blue'} style={{ fontSize: 11 }}>
                    {aiSource === 'live' ? 'Live OpenAI' : 'BookLeaf KB-Grounded Draft'}
                  </Tag>
                </div>

                <Space>
                  <Button
                    type="primary"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={handleUseDraftInReply}
                    style={{ backgroundColor: '#15803d', borderColor: '#15803d' }}
                  >
                    Insert into Reply Box to Edit & Send
                  </Button>
                  {aiDraft && (
                    <Button size="small" onClick={() => setAiDraft(null)}>
                      Dismiss
                    </Button>
                  )}
                </Space>
              </div>

              {aiPolicies.length > 0 && (
                <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    Policies Grounded:
                  </Text>
                  {aiPolicies.map((p, idx) => (
                    <Tag key={idx} color="default" style={{ fontSize: 11 }}>
                      {p}
                    </Tag>
                  ))}
                </div>
              )}

              <Paragraph
                style={{
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: '#334155',
                  backgroundColor: '#f8fafc',
                  padding: 12,
                  borderRadius: 6,
                  border: '1px solid #e2e8f0',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {aiDraft || ticket.aiDraftResponse}
              </Paragraph>
              <div style={{ marginTop: 8, fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                <InfoCircleOutlined />
                <span>
                  <strong>Safety Assurance:</strong> Generating this draft does not send it. Admins can review, modify, or customize the draft before submitting it as a public reply.
                </span>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Conversation Thread */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
        {/* Original Query (Demarcated Root Message) */}
        <Card
          style={{
            borderRadius: 12,
            borderLeft: '4px solid #1b4332',
            background: '#ffffff',
            boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
          }}
          styles={{ body: { padding: '18px 20px' } }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Avatar style={{ backgroundColor: '#1b4332' }} icon={<UserOutlined />} />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Text strong>{ticket.author?.name || 'Author'}</Text>
                <Tag color="green" style={{ fontSize: 10, padding: '0 4px', lineHeight: '18px' }}>
                  Author • Original Query
                </Tag>
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af' }}>
                {new Date(ticket.createdAt).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </div>
            </div>
          </div>

          <Paragraph style={{ fontSize: 14, lineHeight: 1.6, color: '#1f2937', whiteSpace: 'pre-wrap', margin: 0 }}>
            {ticket.description}
          </Paragraph>
        </Card>

        {/* Follow-up Messages */}
        {messages.map((msg) => {
          const isSenderAuthor = msg.sender.role === 'AUTHOR';
          const isInternal = msg.isInternal;

          if (isInternal) {
            // Admin-only internal note card
            return (
              <div key={msg.id} className="chat-bubble-internal" style={{ alignSelf: 'stretch' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <LockOutlined style={{ color: '#d97706' }} />
                  <Tag color="warning" style={{ fontWeight: 700, margin: 0 }}>
                    INTERNAL NOTE — BookLeaf Ops Only (Hidden from Author)
                  </Tag>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    by {msg.sender.email} • {new Date(msg.createdAt).toLocaleTimeString()}
                  </Text>
                </div>
                <div style={{ fontSize: 13, color: '#78350f', whiteSpace: 'pre-wrap' }}>{msg.content}</div>
              </div>
            );
          }

          if (isSenderAuthor) {
            // Author message (Right aligned)
            return (
              <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                  <Text strong style={{ fontSize: 12 }}>
                    {msg.sender.authorProfile?.name || 'Author'}
                  </Text>
                  <Avatar size="small" style={{ backgroundColor: '#2d6a4f' }} icon={<UserOutlined />} />
                </div>
                <div className="chat-bubble-author">
                  <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{msg.content}</div>
                </div>
              </div>
            );
          }

          // Admin / Support agent message (Left aligned)
          return (
            <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Avatar size="small" style={{ backgroundColor: '#1b4332' }} icon={<CustomerServiceOutlined />} />
                <Text strong style={{ fontSize: 12, color: '#1b4332' }}>
                  BookLeaf Support Team
                </Text>
                <SafetyCertificateFilled style={{ color: '#059669', fontSize: 12 }} />
                <Tag color="blue" style={{ fontSize: 10, padding: '0 4px', lineHeight: '18px' }}>
                  Support Agent
                </Tag>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </div>
              <div className="chat-bubble-agent">
                <div style={{ fontSize: 14, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{msg.content}</div>
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply Input Box */}
      <Card
        style={{
          borderRadius: 14,
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          border: '1px solid #e5e7eb',
        }}
      >
        {user?.role === 'ADMIN' && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 12,
              padding: '8px 12px',
              borderRadius: 8,
              backgroundColor: isInternalNote ? '#fffbeb' : '#f0fdf4',
              border: `1px solid ${isInternalNote ? '#fde68a' : '#bbf7d0'}`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {isInternalNote ? <LockOutlined style={{ color: '#d97706' }} /> : <SafetyCertificateFilled style={{ color: '#059669' }} />}
              <Text strong style={{ fontSize: 13, color: isInternalNote ? '#92400e' : '#166534' }}>
                {isInternalNote ? 'Internal Note Mode (Hidden from Author)' : 'Public Reply Mode (Visible to Author)'}
              </Text>
            </div>
            <Space>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Internal Note?</span>
              <Switch checked={isInternalNote} onChange={setIsInternalNote} />
            </Space>
          </div>
        )}

        <TextArea
          rows={4}
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder={
            user?.role === 'ADMIN'
              ? isInternalNote
                ? 'Type an internal note for the operations team (e.g. printer partner dispatch confirmation)...'
                : 'Type a professional response to the author...'
              : 'Type your message or follow-up question...'
          }
          style={{ borderRadius: 8, marginBottom: 12, fontSize: 14 }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Press Send to add your message to this conversation thread.
          </Text>
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={sendingReply}
            disabled={!replyText.trim()}
            onClick={handleSendReply}
            style={{
              backgroundColor: isInternalNote ? '#d97706' : '#1b4332',
              borderColor: isInternalNote ? '#d97706' : '#1b4332',
              fontWeight: 600,
              padding: '0 24px',
              borderRadius: 8,
            }}
          >
            {isInternalNote ? 'Post Internal Note' : 'Send Reply'}
          </Button>
        </div>
      </Card>
    </div>
  );
};
