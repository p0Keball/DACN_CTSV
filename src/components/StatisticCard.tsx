import React from 'react';
import { Card, Row, Col, Typography, Space } from 'antd';
import {
  ClockCircleOutlined,
  CalendarOutlined,
  ExclamationCircleOutlined,
  FolderOutlined,
  CheckCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import { statsData } from '../mockData';

const { Text, Title } = Typography;

// Danh sách Icon hiển thị tương ứng cho từng thẻ
const cardIcons = [
  <ClockCircleOutlined style={{ fontSize: '20px', color: '#1677ff' }} />,
  <CalendarOutlined style={{ fontSize: '20px', color: '#1677ff' }} />,
  <ExclamationCircleOutlined style={{ fontSize: '20px', color: '#ff4d4f' }} />,
  <FolderOutlined style={{ fontSize: '20px', color: '#1677ff' }} />,
  <CheckCircleOutlined style={{ fontSize: '20px', color: '#52c41a' }} />,
];

const StatisticCard: React.FC = () => {
  return (
    <Row gutter={[16, 16]}>
      {statsData.map((item, index) => (
        <Col xs={24} sm={12} md={8} lg={4} key={index} style={{ flex: '1 1 18%', minWidth: '200px' }}>
          <Card
            bordered={false}
            style={{ borderRadius: '8px', boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)' }}
            bodyStyle={{ padding: '16px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <Text type="secondary" style={{ fontSize: '13px' }}>
                  {item.title}
                </Text>
                <Title level={2} style={{ margin: '4px 0 8px 0', fontWeight: 700, fontSize: '26px' }}>
                  {item.value}
                </Title>
              </div>
              <div
                style={{
                  backgroundColor: '#f5f5f5',
                  padding: '8px',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {cardIcons[index]}
              </div>
            </div>

            <Space size={4}>
              <Text
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: item.isUp ? '#52c41a' : '#ff4d4f',
                }}
              >
                {item.isUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />} {item.change}
              </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {item.subText}
              </Text>
            </Space>
          </Card>
        </Col>
      ))}
    </Row>
  );
};

export default StatisticCard;