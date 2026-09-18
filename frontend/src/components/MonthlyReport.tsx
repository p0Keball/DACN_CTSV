import React from 'react';
import { Card, Row, Col, Typography, Space } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined } from '@ant-design/icons';
import { monthlyReportData } from '../mockData';

const { Title, Text } = Typography;

const MonthlyReport: React.FC = () => {
  return (
    <div style={{ marginTop: '16px', marginBottom: '24px' }}>
      <Card
        title={<Title level={5} style={{ margin: 0 }}>Báo cáo nhanh / Thống kê theo tháng</Title>}
        bordered={false}
        style={{ borderRadius: '8px' }}
      >
        <Row gutter={[16, 16]}>
          {monthlyReportData.map((item, index) => (
            <Col xs={24} sm={12} md={8} lg={4} key={index}>
              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#fafafa',
                  borderRadius: '6px',
                  border: '1px solid #f0f0f0',
                }}
              >
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {item.title}
                </Text>
                <Title level={3} style={{ margin: '4px 0', fontWeight: 700 }}>
                  {item.value}
                </Title>
                <Space size={2}>
                  <Text
                    style={{
                      fontSize: '11px',
                      color: item.change.includes('-') ? '#ff4d4f' : '#52c41a',
                    }}
                  >
                    {item.change.includes('-') ? <ArrowDownOutlined /> : <ArrowUpOutlined />}
                    {item.change}
                  </Text>
                </Space>
              </div>
            </Col>
          ))}
        </Row>
      </Card>
    </div>
  );
};

export default MonthlyReport;