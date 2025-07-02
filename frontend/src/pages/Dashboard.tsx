import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  Button,
} from '@mui/material';
import {
  Inventory,
  Analytics,
  TrendingUp,
  Assignment,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const stats = [
    {
      title: 'Total Bags',
      value: '3',
      icon: <Inventory sx={{ fontSize: 40 }} />,
      color: '#1976d2',
      path: '/bags',
    },
    {
      title: 'Total Scripts',
      value: '15',
      icon: <Assignment sx={{ fontSize: 40 }} />,
      color: '#388e3c',
      path: '/scripts',
    },
    {
      title: 'Performance',
      value: '0%',
      icon: <TrendingUp sx={{ fontSize: 40 }} />,
      color: '#f57c00',
      path: '/analytics',
    },
    {
      title: 'Missing Items',
      value: '2',
      icon: <Analytics sx={{ fontSize: 40 }} />,
      color: '#d32f2f',
      path: '/missing-bags',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 4 }}>
        Welcome to your TikTok Streamer Helper Dashboard
      </Typography>

      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 3,
                }
              }}
              onClick={() => navigate(stat.path)}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Box sx={{ color: stat.color, mr: 2 }}>
                    {stat.icon}
                  </Box>
                  <Box>
                    <Typography variant="h4" component="div">
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {stat.title}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Quick Actions
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button 
                variant="contained" 
                onClick={() => navigate('/csv-import')}
                fullWidth
              >
                Import New Products
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => navigate('/bags')}
                fullWidth
              >
                View Inventory
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => navigate('/analytics')}
                fullWidth
              >
                View Analytics
              </Button>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <Typography variant="body2" color="text.secondary">
              • 3 bags imported successfully
              <br />
              • 15 scripts generated
              <br />
              • 2 missing products detected
              <br />
              • System ready for livestreaming
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 