import React from 'react';
import { Layout, Dropdown, Space, Typography } from 'antd';
import {
  BookOutlined,
  CustomerServiceOutlined,
  PlusCircleOutlined,
  LogoutOutlined,
  SwapOutlined,
  ReadOutlined,
  DashboardOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

export const AppLayout: React.FC = () => {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const getInitials = (name?: string, email?: string): string => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return 'AU';
  };

  const navItems = [
    {
      path: '/dashboard',
      label: 'Royalty Dashboard',
      icon: <DashboardOutlined />,
      isActive: location.pathname === '/dashboard' || location.pathname === '/',
    },
    {
      path: '/books',
      label: 'My Books',
      icon: <BookOutlined />,
      isActive: location.pathname.startsWith('/books'),
    },
    {
      path: '/tickets',
      label: 'Support Tickets',
      icon: <CustomerServiceOutlined />,
      isActive: location.pathname === '/tickets' || (location.pathname.startsWith('/tickets') && location.pathname !== '/tickets/new'),
    },
    {
      path: '/tickets/new',
      label: 'Raise a Ticket',
      icon: <PlusCircleOutlined />,
      isActive: location.pathname.startsWith('/tickets/new'),
    },
  ];

  const demoUsers = [
    {
      name: 'Priya Sharma (AUTH001)',
      email: 'priya.sharma@email.com',
      desc: '2 Published Books (₹3,570 pending)',
    },
    {
      name: 'Sneha Kulkarni (AUTH007)',
      email: 'sneha.kulkarni@email.com',
      desc: '2 Published, 1 In Production',
    },
    {
      name: 'Kavita Deshmukh (AUTH009)',
      email: 'kavita.deshmukh@email.com',
      desc: '1 Published, 1 Typesetting',
    },
    {
      name: 'BookLeaf Ops Admin',
      email: 'admin@bookleaf.com',
      desc: 'Admin view & Internal Notes',
    },
  ];

  const profileMenuItems = [
    {
      key: 'user-info',
      disabled: true,
      label: (
        <div style={{ padding: '4px 0' }}>
          <div style={{ fontWeight: 600, color: '#1f2937' }}>
            {user?.authorProfile?.name || user?.email}
          </div>
          <div style={{ fontSize: 12, color: '#6b7280' }}>
            {user?.authorProfile?.authorCode ? `Author ID: ${user.authorProfile.authorCode}` : user?.role}
          </div>
          {user?.authorProfile?.city && (
            <div style={{ fontSize: 11, color: '#9ca3af' }}>📍 {user.authorProfile.city}</div>
          )}
        </div>
      ),
    },
    { type: 'divider' as const },
    ...navItems.map((item) => ({
      key: `mobile-nav-${item.path}`,
      icon: item.icon,
      label: item.label,
      className: 'editorial-mobile-nav-menu-item',
      onClick: () => navigate(item.path),
    })),
    { type: 'divider' as const, className: 'editorial-mobile-nav-divider' },
    {
      key: 'quick-switch-header',
      disabled: true,
      label: <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af' }}>QUICK ROLE SWITCH</span>,
    },
    ...demoUsers.map((u) => ({
      key: u.email,
      icon: <SwapOutlined />,
      label: (
        <div>
          <div>{u.name}</div>
          <div style={{ fontSize: 11, color: '#9ca3af' }}>{u.desc}</div>
        </div>
      ),
      onClick: async () => {
        await login(u.email);
        navigate('/dashboard');
      },
    })),
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      danger: true,
      label: 'Sign Out',
      onClick: () => {
        logout();
        navigate('/login');
      },
    },
  ];

  const authorName = user?.authorProfile?.name || user?.email.split('@')[0] || 'Author';
  const authorInitials = getInitials(user?.authorProfile?.name, user?.email);
  const authorCode = user?.authorProfile?.authorCode || (user?.role === 'ADMIN' ? 'ADMIN' : 'AUTHOR');

  return (
    <Layout style={{ minHeight: '100vh', background: '#f8f6f0' }}>
      <Header className="editorial-layout-header">
        <div className="editorial-header-inner">
          <div
            className="editorial-brand-box"
            onClick={() => navigate('/dashboard')}
          >
            <div className="editorial-brand-icon">
              <ReadOutlined />
            </div>
            <div className="editorial-brand-text">
              <span className="editorial-brand-name">BookLeaf Publishing</span>
              <span className="editorial-brand-sub">Author Support Portal</span>
            </div>
          </div>

          <nav aria-label="Main Navigation">
            <ul className="editorial-nav-list">
              {navItems.map((item) => (
                <li key={item.path}>
                  <button
                    type="button"
                    className={`editorial-nav-item ${item.isActive ? 'active' : ''}`}
                    onClick={() => navigate(item.path)}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <div className="editorial-header-right">
            <span className="editorial-auth-pill">
              {authorCode}
            </span>

            <Dropdown menu={{ items: profileMenuItems }} trigger={['click']} placement="bottomRight">
              <button type="button" className="editorial-profile-btn">
                <div className="editorial-avatar">
                  {authorInitials}
                </div>
                <span className="editorial-profile-name">
                  {authorName}
                </span>
                <DownOutlined style={{ fontSize: 10, color: '#9abfae' }} />
              </button>
            </Dropdown>
          </div>
        </div>
      </Header>

      <Content style={{ background: '#f8f6f0', width: '100%' }}>
        <div className="editorial-page-container">
          <Outlet />
        </div>
      </Content>

      <Footer
        style={{
          textAlign: 'center',
          color: '#828f86',
          fontSize: 13,
          background: '#f8f6f0',
          borderTop: '1px solid #e7e2d7',
          padding: '24px',
        }}
      >
        <Space direction="vertical" size={2}>
          <Text style={{ color: '#68776e' }}>
            BookLeaf Publishing Author Support & Communication Portal • 80/20 Royalty Split • Delhi, India
          </Text>
          <Text style={{ fontSize: 11, color: '#8e9d94' }}>
            Author Workspace • Royalties, Catalog, and Dedicated Support
          </Text>
        </Space>
      </Footer>
    </Layout>
  );
};
