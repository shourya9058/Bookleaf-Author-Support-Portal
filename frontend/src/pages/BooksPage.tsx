import React, { useEffect, useState } from 'react';
import {
  Table,
  Input,
  Select,
  Alert,
  Spin,
} from 'antd';
import {
  BookOutlined,
  SearchOutlined,
  CustomerServiceOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import type { Book } from '../types';

export const BooksPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const fetchBooks = async () => {
    setLoading(true);
    setError(null);
    try {
      if (user?.role === 'ADMIN') {
        setLoading(false);
        return;
      }
      const data = await api.author.getBooks();
      setBooks(data.books);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch author books');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = 'My Books | BookLeaf Publishing';
    fetchBooks();
  }, [user]);

  const formatDate = (dateString?: string | null): string => {
    if (!dateString) return 'In Production';
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
                The author publishing catalogue is specific to each author account. Please switch to an author profile via the top-right menu to view their titles and royalties.
              </p>
            </div>
          }
        />
      </div>
    );
  }

  const publishedCount = books.filter((b) => b.status.toLowerCase().includes('published')).length;
  const productionCount = books.filter((b) => b.status.toLowerCase().includes('production')).length;

  const filteredBooks = books.filter((book) => {
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      book.title.toLowerCase().includes(term) ||
      book.isbn.toLowerCase().includes(term) ||
      book.genre.toLowerCase().includes(term);

    if (!matchesSearch) return false;

    if (statusFilter === 'PUBLISHED') {
      return book.status.toLowerCase().includes('published');
    }
    if (statusFilter === 'PRODUCTION') {
      return book.status.toLowerCase().includes('production');
    }
    return true;
  });

  const columns = [
    {
      title: 'Book Title & ISBN',
      key: 'title',
      width: '26%',
      render: (_: any, record: Book) => {
        const cover = getCoverClass(record.title, record.genre);
        const g = formatGenre(record.genre);
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
              <span className="editorial-genre-main" style={{ fontSize: 12 }}>
                {g.main} {g.sub ? `• ${g.sub}` : ''}
              </span>
              <span className="editorial-book-isbn">ISBN: {record.isbn}</span>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Status & Date',
      key: 'status',
      width: '16%',
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
      title: 'Pricing & Split',
      key: 'pricing',
      width: '14%',
      render: (_: any, record: Book) => (
        <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
          <div>
            <span style={{ color: '#5f6d65' }}>MRP: </span>
            <span style={{ fontWeight: 700, color: '#13221b' }}>
              {record.mrp !== null ? `₹${record.mrp.toLocaleString('en-IN')}` : 'Pending'}
            </span>
          </div>
          <div>
            <span style={{ color: '#5f6d65' }}>Author Share: </span>
            <span style={{ fontWeight: 700, color: '#166534' }}>
              {record.authorRoyaltyPerCopy !== null ? `₹${record.authorRoyaltyPerCopy.toLocaleString('en-IN')}` : 'Pending'}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: 'Sales & Royalties',
      key: 'sales',
      width: '18%',
      render: (_: any, record: Book) => (
        <div style={{ fontSize: 12.5, lineHeight: 1.5 }}>
          <div>
            <span style={{ color: '#5f6d65' }}>Copies Sold: </span>
            <span style={{ fontWeight: 700, color: '#13221b' }}>
              {record.totalCopiesSold.toLocaleString('en-IN')}
            </span>
          </div>
          <div>
            <span style={{ color: '#5f6d65' }}>Royalty Earned: </span>
            <span style={{ fontWeight: 700, color: '#13221b' }}>
              ₹{record.totalRoyaltyEarned.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div>
            <span style={{ color: '#5f6d65' }}>Pending Payout: </span>
            <span style={{ fontWeight: 700, color: record.royaltyPending > 0 ? '#b45309' : '#059669' }}>
              ₹{record.royaltyPending.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      ),
    },
    {
      title: 'Distribution & Print',
      key: 'distribution',
      width: '16%',
      render: (_: any, record: Book) => (
        <div>
          {record.printPartner && (
            <div className="editorial-print-tag" style={{ marginBottom: 6 }}>
              <PrinterOutlined style={{ fontSize: 12, color: '#68776e' }} />
              <span>Print: <strong>{record.printPartner}</strong></span>
            </div>
          )}
          {record.availableOn && record.availableOn.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {record.availableOn.map((platform) => (
                <span key={platform} className="editorial-platform-tag">
                  {platform}
                </span>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: 12, color: '#88948d', fontStyle: 'italic' }}>
              Listing setup in progress
            </span>
          )}
        </div>
      ),
    },
    {
      title: 'Action',
      key: 'action',
      width: '10%',
      render: (_: any, record: Book) => (
        <button
          type="button"
          className="editorial-action-btn"
          onClick={() => navigate(`/tickets/new?bookId=${record.id}`)}
        >
          <CustomerServiceOutlined />
          <span>Raise Query</span>
        </button>
      ),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 className="brand-font" style={{ fontSize: 28, fontWeight: 700, color: '#122019', margin: 0, lineHeight: 1.2 }}>
            My Published Titles
          </h1>
          <p style={{ fontSize: 14, color: '#55635a', margin: '6px 0 0 0', lineHeight: 1.5 }}>
            Review sales performance, ISBN assignments, and royalty details across your BookLeaf publishing catalogue.
          </p>
        </div>

        <button
          type="button"
          className="editorial-primary-btn"
          onClick={() => navigate('/tickets/new')}
        >
          <CustomerServiceOutlined />
          <span>Raise Query on a Book</span>
        </button>
      </div>

      {error && (
        <Alert
          type="error"
          showIcon
          message="Failed to load titles"
          description={error}
          action={
            <button
              type="button"
              className="editorial-action-btn"
              onClick={fetchBooks}
            >
              Retry
            </button>
          }
        />
      )}

      <div className="editorial-toolbar">
        <div className="editorial-toolbar-left">
          <Input
            prefix={<SearchOutlined style={{ color: '#8b9690', marginRight: 4 }} />}
            placeholder="Search by book title, ISBN, or genre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            allowClear
            style={{
              backgroundColor: '#faf9f6',
              border: '1px solid #dcdfd9',
              borderRadius: 8,
              height: 38,
              fontSize: 13.5,
            }}
          />
        </div>

        <div className="editorial-toolbar-right">
          <span style={{ fontSize: 12.5, color: '#68776e', fontWeight: 500 }}>
            Showing {filteredBooks.length} of {books.length} title{books.length === 1 ? '' : 's'}
          </span>
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: 190, height: 38 }}
            options={[
              { value: 'ALL', label: `All Statuses (${books.length})` },
              { value: 'PUBLISHED', label: `Published & Live (${publishedCount})` },
              { value: 'PRODUCTION', label: `In Production (${productionCount})` },
            ]}
          />
        </div>
      </div>

      <div className="editorial-catalog-card">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 14, color: '#68776e', fontSize: 13.5 }}>
              Loading publishing catalogue...
            </div>
          </div>
        ) : (
          <Table
            columns={columns}
            dataSource={filteredBooks}
            rowKey="id"
            scroll={{ x: 1050 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              showTotal: (total, range) => `Showing ${range[0]}–${range[1]} of ${total} titles`,
            }}
            locale={{
              emptyText: (
                <div style={{ padding: '48px 0', textAlign: 'center' }}>
                  <BookOutlined style={{ fontSize: 36, color: '#a0aca4', marginBottom: 12 }} />
                  <div style={{ fontWeight: 600, color: '#334038', fontSize: 14 }}>
                    No books matching your query
                  </div>
                  <div style={{ fontSize: 12.5, color: '#7a877f', marginTop: 4 }}>
                    Try clearing filters or searching with different keywords
                  </div>
                </div>
              ),
            }}
          />
        )}
      </div>
    </div>
  );
};
