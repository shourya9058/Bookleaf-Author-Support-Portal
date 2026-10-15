import React, { useState, useEffect, useCallback } from 'react';
import { Form, Input, Button, Alert } from 'antd';
import {
  MailOutlined,
  LockOutlined,
  ReadOutlined,
  ArrowRightOutlined,
  LeftOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import publishingDeskImage from '../assets/publishing-desk.jpg';
import publishingStudyImage from '../assets/publishing-study.jpg';
import publishingCraftImage from '../assets/publishing-craft.jpg';

interface Slide {
  image: string;
  eyebrow: string;
  titleLead: string;
  titleEmphasis: string;
  description: string;
}

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const slides: Slide[] = [
    {
      image: publishingDeskImage,
      eyebrow: 'AUTHORS · BOOKS · ROYALTIES · SUPPORT',
      titleLead: 'A Brighter Tomorrow for ',
      titleEmphasis: 'Your Stories.',
      description:
        'Manage your books, track your royalties, and get the support you need — all in one place, built for authors.',
    },
    {
      image: publishingStudyImage,
      eyebrow: 'CRAFT · EDITORIAL · DEDICATION',
      titleLead: 'The Quiet Work Behind Every ',
      titleEmphasis: 'Great Book.',
      description:
        'From first manuscript proof to global distribution, our team ensures every edition meets exceptional publishing standards.',
    },
    {
      image: publishingCraftImage,
      eyebrow: 'TRANSPARENCY · ROYALTIES · INSIGHT',
      titleLead: 'Clarity in Royalties, Certainty in ',
      titleEmphasis: 'Every Print.',
      description:
        'Track printed copies, monitor quarterly royalty statements, and resolve production queries with direct editorial support.',
    },
  ];

  const handleNext = useCallback(() => {
    setActiveSlide((prev) => (prev + 1) % slides.length);
  }, [slides.length]);

  const handlePrev = useCallback(() => {
    setActiveSlide((prev) => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  useEffect(() => {
    document.title = 'Sign In | BookLeaf Publishing';
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      handleNext();
    }, 6500);
    return () => clearInterval(interval);
  }, [isPaused, handleNext]);

  const handleSubmit = async (values: { email: string; password?: string }) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await login(values.email, values.password);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (email: string) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await login(email);
      navigate('/dashboard');
    } catch (err: any) {
      setErrorMsg(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    {
      initials: 'PS',
      name: 'Priya Sharma',
      code: 'AUTH001',
      email: 'priya.sharma@email.com',
      note: '2 published books · ₹3,570 pending',
      avatarBg: '#d8f3dc',
      avatarColor: '#1b4332',
      badgeBg: '#e8f5ec',
      badgeColor: '#1b4332',
    },
    {
      initials: 'SK',
      name: 'Sneha Kulkarni',
      code: 'AUTH007',
      email: 'sneha.kulkarni@email.com',
      note: 'Published titles · 1 in production',
      avatarBg: '#fed7aa',
      avatarColor: '#9a3412',
      badgeBg: '#fff2e5',
      badgeColor: '#9a3412',
    },
    {
      initials: 'KD',
      name: 'Kavita Deshmukh',
      code: 'AUTH009',
      email: 'kavita.deshmukh@email.com',
      note: 'Published title · 1 in production',
      avatarBg: '#e0e7ff',
      avatarColor: '#3730a3',
      badgeBg: '#f0f3ff',
      badgeColor: '#3730a3',
    },
    {
      initials: 'BO',
      name: 'BookLeaf Ops Admin',
      code: 'ADMIN',
      email: 'admin@bookleaf.com',
      note: 'Ticket queue · Internal notes & statuses',
      avatarBg: '#dbeafe',
      avatarColor: '#1e40af',
      badgeBg: '#edf4fc',
      badgeColor: '#1e40af',
    },
  ];

  return (
    <div className="cinematic-login-layout">
      <div
        className="cinematic-left-panel"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {slides.map((slide, index) => (
          <div
            key={slide.image}
            className={`cinematic-slide-layer ${index === activeSlide ? 'active' : ''}`}
          >
            <img
              src={slide.image}
              alt="BookLeaf publishing atmosphere"
              className="cinematic-slide-img"
            />
            <div className="cinematic-slide-gradient" />
          </div>
        ))}

        <div className="cinematic-brand-header">
          <div className="cinematic-brand-icon">
            <ReadOutlined />
          </div>
          <div className="cinematic-brand-text">
            <span className="cinematic-brand-title">BookLeaf Publishing</span>
            <span className="cinematic-brand-subtitle">Author Support & Royalty Portal</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePrev}
          className="cinematic-nav-btn cinematic-nav-btn-prev"
          aria-label="Previous slide"
        >
          <LeftOutlined />
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="cinematic-nav-btn cinematic-nav-btn-next"
          aria-label="Next slide"
        >
          <RightOutlined />
        </button>

        <div className="cinematic-editorial-content">
          <span className="cinematic-editorial-eyebrow">
            {slides[activeSlide]?.eyebrow}
          </span>
          <h1 className="cinematic-editorial-headline">
            {slides[activeSlide]?.titleLead}
            <span className="cinematic-headline-italic">
              {slides[activeSlide]?.titleEmphasis}
            </span>
          </h1>
          <p className="cinematic-editorial-subtext">
            {slides[activeSlide]?.description}
          </p>
        </div>

        <div className="cinematic-indicators">
          {slides.map((slide, index) => (
            <button
              key={slide.image}
              type="button"
              onClick={() => setActiveSlide(index)}
              className={`cinematic-indicator-dash ${
                index === activeSlide ? 'active' : ''
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </div>

      <div className="cinematic-right-panel">
        <div className="cinematic-form-container">
          <div style={{ textAlign: 'center' }}>
            <div className="cinematic-brand-badge-box">
              <ReadOutlined />
            </div>
            <h2 className="cinematic-portal-title">BookLeaf Publishing</h2>
            <p className="cinematic-portal-subtitle">Author Support & Royalty Portal</p>
            <div className="cinematic-portal-line" />
          </div>

          {errorMsg && (
            <Alert
              message="Sign in failed"
              description={errorMsg}
              type="error"
              showIcon
              closable
              onClose={() => setErrorMsg(null)}
              style={{ marginBottom: 16, borderRadius: 6 }}
            />
          )}

          <Form form={form} layout="vertical" onFinish={handleSubmit} requiredMark={false}>
            <Form.Item
              name="email"
              label={<span className="cinematic-form-label">Email address</span>}
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Enter a valid email' },
              ]}
            >
              <Input
                id="email"
                type="email"
                autoComplete="username"
                prefix={<MailOutlined style={{ color: '#9ca3af' }} />}
                placeholder="e.g. priya.sharma@email.com"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span className="cinematic-form-label">Password</span>}
              rules={[{ required: true, message: 'Please enter your password' }]}
            >
              <Input.Password
                id="current-password"
                autoComplete="current-password"
                prefix={<LockOutlined style={{ color: '#9ca3af' }} />}
                placeholder="Enter your password"
                size="large"
              />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              size="large"
              block
              loading={loading}
              className="cinematic-submit-btn"
            >
              <span>Sign in to your portal</span>
              <ArrowRightOutlined />
            </Button>
          </Form>

          <div className="cinematic-demo-divider">
            <span className="cinematic-demo-line" />
            <span className="cinematic-demo-label">Quick Demo Access</span>
            <span className="cinematic-demo-line" />
          </div>

          <div className="cinematic-demo-list">
            {demoAccounts.map((account) => (
              <div
                key={account.email}
                onClick={() => handleQuickLogin(account.email)}
                className="cinematic-demo-card"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleQuickLogin(account.email);
                  }
                }}
              >
                <div
                  className="cinematic-demo-avatar"
                  style={{
                    backgroundColor: account.avatarBg,
                    color: account.avatarColor,
                  }}
                >
                  {account.initials}
                </div>

                <div className="cinematic-demo-body">
                  <div className="cinematic-demo-title-row">
                    <span className="cinematic-demo-name">{account.name}</span>
                    <span
                      className="cinematic-demo-badge"
                      style={{
                        backgroundColor: account.badgeBg,
                        color: account.badgeColor,
                      }}
                    >
                      {account.code}
                    </span>
                  </div>
                  <div className="cinematic-demo-note">{account.note}</div>
                </div>

                <ArrowRightOutlined className="cinematic-demo-arrow" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
