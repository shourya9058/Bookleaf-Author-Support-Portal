import React, { useEffect, useState } from 'react';
import {
  Row,
  Col,
  Table,
  Button,
  Alert,
  Spin,
  Space,
  Dropdown,
} from 'antd';
import {
  BookOutlined,
  BankOutlined,
  ClockCircleOutlined,
  CheckCircleFilled,
  CustomerServiceOutlined,
  FileTextOutlined,
  PlusOutlined,
  CheckOutlined,
  InfoCircleOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { Book, RoyaltySummary } from '../types';
import dashboardBannerImg from '../assets/dashboard-banner.jpg';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [summary, setSummary] = useState<RoyaltySummary | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (user?.role === 'ADMIN') {
        setLoading(false);
        return;
      }
      const data = await api.author.getBooks();
      setBooks(data.books);
      setSummary(data.summary);
    } catch (err: any) {
      setError(err.message || 'Failed to load royalty dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'Royalty Dashboard | BookLeaf Publishing';
    fetchDashboardData();
  }, [user]);

  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return '—';
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return dateString;
      return d.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatGenre = (genreStr?: string) => {
    if (!genreStr) return { main: 'General', sub: '' };
    const parts = genreStr.split('/').map((s) => s.trim());
    return {
      main: parts[0] || 'General',
      sub: parts.slice(1).join(' / '),
    };
  };

  const getCoverClass = (title: string, genre: string) => {
    const lower = (title + ' ' + genre).toLowerCase();
    if (lower.includes('saffron') || lower.includes('memoir') || lower.includes('karma')) {
      return {
        wrap: 'editorial-book-cover-cream',
        title: 'editorial-book-title-ink',
        line: 'editorial-book-line-ink',
      };
    }
    if (lower.includes('ganges') || lower.includes('fiction') || lower.includes('sutra')) {
      return {
        wrap: 'editorial-book-cover-ochre',
        title: 'editorial-book-title-gold',
        line: 'editorial-book-line-gold',
      };
    }
    return {
      wrap: 'editorial-book-cover-forest',
      title: 'editorial-book-title-gold',
      line: 'editorial-book-line-gold',
    };
  };

  if (user?.role === 'ADMIN') {
    return (
      <div className="editorial-card" style={{ maxWidth: 800, margin: '40px auto' }}>
        <Alert
          type="info"
          showIcon
          message="Administrator Mode Active"
          description={
            <div>
              <p style={{ margin: '8px 0' }}>
                You are currently signed in as <strong>{user.email}</strong> with the <strong>ADMIN</strong> role.
              </p>
              <p style={{ margin: '8px 0' }}>
                The author royalty dashboard is customized for individual author accounts. You can inspect all incoming queries in the{' '}
                <Button type="link" onClick={() => navigate('/tickets')} style={{ padding: 0 }}>
                  Support Tickets Queue
                </Button>
                , or switch to an author profile such as Priya Sharma via the top-right profile menu.
              </p>
            </div>
          }
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: '#68776e', fontSize: 14 }}>
          Loading your editorial workspace & royalties...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        type="error"
        showIcon
        message="Unable to Load Author Dashboard"
        description={error}
        action={
          <Button type="primary" danger onClick={fetchDashboardData}>
            Retry
          </Button>
        }
      />
    );
  }

  const authorName = user?.authorProfile?.name || 'Author';
  const publishedCount = summary?.publishedBooks ?? books.filter((b) => b.status.toLowerCase().includes('published')).length;
  const pendingAmount = summary?.royaltyPending || 0;
  const thresholdAmount = summary?.minimumPayoutThreshold || 1000;
  const progressPercent = Math.min(100, Math.round((pendingAmount / thresholdAmount) * 100));
  const isEligible = summary?.payoutEligible ?? (pendingAmount >= thresholdAmount);

  const columns = [
    {
      title: 'Book Title & ISBN',
      key: 'title',
      width: '30%',
      render: (_: any, record: Book) => {
        const cover = getCoverClass(record.title, record.genre);
        return (
          <div className="editorial-book-cell">
            <div className={`editorial-book-cover-thumb ${cover.wrap}`}>
              <span className={`editorial-book-cover-title ${cover.title}`}>
                {record.title}
              </span>
              <div className={`editorial-book-line ${cover.line}`} />
              <div style={{ fontSize: 6, textAlign: 'center', opacity: 0.7 }} className={cover.title}>
                BL
              </div>
            </div>
            <div className="editorial-book-info">
              <span className="editorial-book-name">{record.title}</span>
              <span className="editorial-book-isbn">ISBN: {record.isbn}</span>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Genre',
      key: 'genre',
      width: '14%',
      render: (_: any, record: Book) => {
        const g = formatGenre(record.genre);
        return (
          <div>
            <div className="editorial-genre-main">{g.main}</div>
            {g.sub && <div className="editorial-genre-sub">{g.sub}</div>}
          </div>
        );
      },
    },
    {
      title: 'Status',
      key: 'status',
      width: '15%',
      render: (_: any, record: Book) => {
        const isPublished = record.status.toLowerCase().includes('published');
        const isDesign = record.status.toLowerCase().includes('design');
        const pillClass = isPublished
          ? 'editorial-status-published'
          : isDesign
          ? 'editorial-status-design'
          : 'editorial-status-production';

        return (
          <div>
            <span className={`editorial-status-pill ${pillClass}`}>
              <span className="editorial-status-dot" />
              {record.status}
            </span>
            <div className="editorial-status-date">
              {formatDate(record.publicationDate)}
            </div>
          </div>
        );
      },
    },
    {
      title: 'Copies Sold',
      dataIndex: 'totalCopiesSold',
      key: 'totalCopiesSold',
      width: '10%',
      render: (val: number) => (
        <span className="editorial-table-num">
          {val.toLocaleString('en-IN')}
        </span>
      ),
    },
    {
      title: 'Royalty Earned',
      dataIndex: 'totalRoyaltyEarned',
      key: 'totalRoyaltyEarned',
      width: '13%',
      render: (val: number) => (
        <span className="editorial-table-num">
          ₹{val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: 'Royalty Pending',
      dataIndex: 'royaltyPending',
      key: 'royaltyPending',
      width: '13%',
      render: (val: number) => (
        <span className={val > 0 ? 'editorial-table-amber' : 'editorial-table-green'}>
          ₹{val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: any, record: Book) => {
        const moreItems = [
          {
            key: 'query',
            label: 'Submit Book Query',
            onClick: () => navigate(`/tickets/new?bookId=${record.id}`),
          },
          {
            key: 'catalog',
            label: 'View in My Books',
            onClick: () => navigate('/books'),
          },
        ];

        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              className="editorial-action-btn"
              onClick={() => navigate(`/tickets/new?bookId=${record.id}`)}
            >
              <CustomerServiceOutlined />
              <span>Raise Query</span>
            </button>
            <Dropdown menu={{ items: moreItems }} trigger={['click']} placement="bottomRight">
              <button type="button" className="editorial-more-btn" aria-label="More options">
                <MoreOutlined />
              </button>
            </Dropdown>
          </div>
        );
      },
    },
  ];

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <div className="editorial-welcome-card">
        <div className="editorial-welcome-body">
          <div className="editorial-eyebrow-row">
            <div className="editorial-eyebrow-bar" />
            <span className="editorial-eyebrow-text">Good to see you again</span>
          </div>

          <h1 className="editorial-welcome-title">
            Welcome back,<br />
            {authorName}.
          </h1>

          <p className="editorial-welcome-desc">
            You've published {publishedCount} title{publishedCount === 1 ? '' : 's'} across major retail marketplaces.
            Here's a quick overview of your royalties and recent activity.
          </p>
        </div>

        <div
          className="editorial-welcome-visual"
          style={{ backgroundImage: `url(${dashboardBannerImg})` }}
        >
          <div className="editorial-visual-mask" />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            className="editorial-support-btn"
            onClick={() => navigate('/tickets/new')}
          >
            Submit Support Query
          </Button>
        </div>
      </div>

      <Row gutter={[20, 20]}>
        <Col xs={24} sm={12} lg={6}>
          <div className="editorial-card">
            <div className="editorial-stat-header">
              <div className="editorial-stat-icon-circle editorial-icon-green">
                <span style={{ fontWeight: 700, fontFamily: 'serif' }}>₹</span>
              </div>
              <span className="editorial-stat-label">Total Royalty Earned</span>
            </div>
            <div className="editorial-stat-value">
              ₹ {(summary?.totalRoyaltyEarned || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="editorial-stat-note">
              80% net author share on all retail sales
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div className="editorial-card">
            <div className="editorial-stat-header">
              <div className="editorial-stat-icon-circle editorial-icon-neutral">
                <BankOutlined />
              </div>
              <span className="editorial-stat-label">Royalty Paid to Date</span>
            </div>
            <div className="editorial-stat-value">
              ₹ {(summary?.royaltyPaid || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="editorial-paid-badge">
              <CheckCircleFilled />
              <span>Transferred to verified bank account</span>
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div className="editorial-card">
            <div className="editorial-stat-header">
              <div className="editorial-stat-icon-circle editorial-icon-amber">
                <ClockCircleOutlined />
              </div>
              <span className="editorial-stat-label">Royalty Pending Payout</span>
            </div>
            <div className="editorial-stat-value editorial-stat-value-amber">
              ₹ {(summary?.royaltyPending || 0).toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div>
              {isEligible ? (
                <span className="editorial-pill-success">
                  <CheckOutlined style={{ fontSize: 10 }} /> Meets ₹1,000 payout threshold
                </span>
              ) : (
                <span className="editorial-pill-neutral">
                  Rolls over (min threshold ₹1,000)
                </span>
              )}
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} lg={6}>
          <div className="editorial-card">
            <div className="editorial-stat-header">
              <div className="editorial-stat-icon-circle editorial-icon-green">
                <BookOutlined />
              </div>
              <span className="editorial-stat-label">Total Copies Sold</span>
            </div>
            <div className="editorial-stat-value">
              {(summary?.totalCopiesSold || 0).toLocaleString('en-IN')}
            </div>
            <div className="editorial-stat-note">
              Across Amazon, Flipkart & Store
            </div>
          </div>
        </Col>
      </Row>

      <div className="editorial-policy-card">
        <Row gutter={[40, 24]} align="middle">
          <Col xs={24} lg={15}>
            <div className="editorial-policy-title-row">
              <FileTextOutlined className="editorial-policy-icon" />
              <span className="editorial-policy-title">
                BookLeaf Quarterly Royalty Cycle & Policy
              </span>
            </div>
            <p className="editorial-policy-text">
              BookLeaf distributes 80% of net profit per title. Calculations occur quarterly and transfers are disbursed
              within 45 days after quarter close. If accumulated royalties are below ₹1,000, they roll ahead to the next
              cycle.
            </p>
          </Col>

          <Col xs={24} lg={9}>
            <div className="editorial-progress-header">
              <span className="editorial-progress-label">
                Threshold Progress (₹{pendingAmount.toLocaleString('en-IN')} of ₹{thresholdAmount.toLocaleString('en-IN')} min)
              </span>
              <span className="editorial-progress-percent">{progressPercent}%</span>
            </div>

            <div className="editorial-progress-track">
              <div
                className="editorial-progress-fill"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            <div className="editorial-eligible-row">
              {isEligible ? (
                <>
                  <div className="editorial-check-badge">
                    <CheckOutlined />
                  </div>
                  <div>
                    <div className="editorial-eligible-lead">
                      You're eligible for the next payout cycle
                    </div>
                    <div className="editorial-eligible-sub">
                      Payouts are processed quarterly within 45 days after quarter end.
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <InfoCircleOutlined style={{ color: '#68776e', fontSize: 18, marginTop: 2 }} />
                  <div>
                    <div className="editorial-eligible-lead">
                      Below ₹1,000 payout threshold
                    </div>
                    <div className="editorial-eligible-sub">
                      Current balance of ₹{pendingAmount.toLocaleString('en-IN')} will roll forward to the next quarterly cycle.
                    </div>
                  </div>
                </>
              )}
            </div>
          </Col>
        </Row>
      </div>

      <div className="editorial-catalog-card">
        <div className="editorial-catalog-header">
          <div className="editorial-catalog-title-group">
            <BookOutlined className="editorial-catalog-icon" />
            <span className="editorial-catalog-title">My Book Catalog Overview</span>
            <span className="editorial-catalog-count-pill">
              {books.length} Total Titles
            </span>
          </div>

          <span
            className="editorial-catalog-link"
            onClick={() => navigate('/books')}
          >
            View Full Catalog & Distribution Details →
          </span>
        </div>

        <Table
          columns={columns}
          dataSource={books}
          rowKey="id"
          pagination={false}
          scroll={{ x: 750 }}
        />
      </div>
    </Space>
  );
};
