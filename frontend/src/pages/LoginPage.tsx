import React, { useState } from 'react';
import { Card, Form, Input, Button, message, Typography } from 'antd';
import { LockOutlined, UserOutlined, ReadOutlined, MailOutlined, TeamOutlined, FileTextOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { login, setAuthToken } from '../services/api';

const { Title, Text } = Typography;

// Trang đăng nhập (2 nửa: trái thương hiệu xanh, phải form to rõ).
// Logic giữ nguyên: gọi /api/auth/login, lưu token, vào Tổng quan.
const LoginPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleFinish = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res = await login(values.username.trim(), values.password);
      if (!res.success) throw new Error(res.message || 'Đăng nhập thất bại');
      localStorage.setItem('ctsv_token', res.data.token);
      localStorage.setItem('ctsv_user', res.data.username);
      setAuthToken(res.data.token);
      message.success(`Chào mừng ${res.data.username}!`);
      navigate('/');
    } catch (e) {
      message.error((e as Error).message || 'Sai tên đăng nhập hoặc mật khẩu');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 16px' }}>
      <Card
        style={{ width: '100%', maxWidth: 880, borderRadius: 16, overflow: 'hidden' }}
        styles={{ body: { padding: 0, display: 'flex', flexWrap: 'wrap' } }}
      >
        {/* Nửa trái: thương hiệu */}
        <div
          style={{
            flex: '1 1 340px',
            background: 'linear-gradient(135deg, #237804 0%, #135200 100%)',
            color: '#fff',
            padding: '48px 40px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 20,
          }}
        >
          <div style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: 10, width: 'fit-content' }}>
            <ReadOutlined style={{ fontSize: 36, color: '#fff' }} />
          </div>
          <Title level={2} style={{ color: '#fff', margin: 0 }}>TRỢ LÝ CTSV</Title>
          <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16 }}>
            Số hóa quy trình công tác sinh viên — Khoa Công nghệ Thông tin, Trường Đại học Đà Lạt
          </Text>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8, fontSize: 15 }}>
            <span><MailOutlined /> Soạn & gửi email công việc</span>
            <span><TeamOutlined /> Phân công, điểm danh sinh viên</span>
            <span><FileTextOutlined /> Báo cáo, rèn luyện, hồ sơ tập trung</span>
          </div>
        </div>

        {/* Nửa phải: form */}
        <div style={{ flex: '1 1 340px', padding: '48px 40px' }}>
          <Title level={3} style={{ marginBottom: 4 }}>Đăng nhập</Title>
          <Text type="secondary" style={{ fontSize: 15 }}>Dành cho trợ lý công tác sinh viên (quản trị viên)</Text>
          <Form layout="vertical" onFinish={handleFinish} style={{ marginTop: 28 }}>
            <Form.Item name="username" label={<span style={{ fontSize: 15 }}>Tên đăng nhập</span>} rules={[{ required: true, message: 'Nhập tên đăng nhập' }]}>
              <Input prefix={<UserOutlined />} placeholder="admin" autoComplete="username" size="large" style={{ fontSize: 16, padding: '10px 12px' }} />
            </Form.Item>
            <Form.Item name="password" label={<span style={{ fontSize: 15 }}>Mật khẩu</span>} rules={[{ required: true, message: 'Nhập mật khẩu' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="••••••••" autoComplete="current-password" size="large" style={{ fontSize: 16, padding: '10px 12px' }} />
            </Form.Item>
            <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
              <Button type="primary" htmlType="submit" loading={loading} block size="large" style={{ height: 48, fontSize: 17 }}>
                Đăng nhập
              </Button>
            </Form.Item>
          </Form>
        </div>
      </Card>
    </div>
  );
};

export default LoginPage;
