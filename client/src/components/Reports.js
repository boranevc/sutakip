import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Alert,
  CircularProgress,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  TrendingUp,
  CalendarToday,
  DateRange,
  BarChart
} from '@mui/icons-material';
import axios from 'axios';

const Reports = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [dailyReport, setDailyReport] = useState(null);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [monthlyReport, setMonthlyReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Tarih seçimi için state'ler
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedWeek, setSelectedWeek] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Günlük rapor getir
  const fetchDailyReport = useCallback(async (date = null) => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/reports/daily', {
        params: { date: date || selectedDate }
      });
      setDailyReport(response.data);
    } catch (error) {
      setError('Günlük rapor yüklenirken hata oluştu');
      console.error('Günlük rapor hatası:', error);
    }
    setLoading(false);
  }, [selectedDate]);

  // Haftalık rapor getir
  const fetchWeeklyReport = useCallback(async (week = null) => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/reports/weekly', {
        params: { week: week || selectedWeek }
      });
      setWeeklyReport(response.data);
    } catch (error) {
      setError('Haftalık rapor yüklenirken hata oluştu');
      console.error('Haftalık rapor hatası:', error);
    }
    setLoading(false);
  }, [selectedWeek]);

  // Aylık rapor getir
  const fetchMonthlyReport = useCallback(async (month = null, year = null) => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.get('/api/reports/monthly', {
        params: { 
          month: month || selectedMonth,
          year: year || selectedYear
        }
      });
      setMonthlyReport(response.data);
    } catch (error) {
      setError('Aylık rapor yüklenirken hata oluştu');
      console.error('Aylık rapor hatası:', error);
    }
    setLoading(false);
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (activeTab === 0) {
      fetchDailyReport();
    } else if (activeTab === 1) {
      fetchWeeklyReport();
    } else if (activeTab === 2) {
      fetchMonthlyReport();
    }
  }, [activeTab, fetchDailyReport, fetchWeeklyReport, fetchMonthlyReport]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleDateChange = (newDate) => {
    setSelectedDate(newDate);
    fetchDailyReport(newDate);
  };

  const handleWeekChange = (newWeek) => {
    setSelectedWeek(newWeek);
    fetchWeeklyReport(newWeek);
  };

  const handleMonthYearChange = (month, year) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    fetchMonthlyReport(month, year);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('tr-TR');
  };

  const getDayName = (dateStr) => {
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    return days[new Date(dateStr).getDay()];
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <BarChart sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
          <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
            Su Tüketim Raporları
          </Typography>
        </Box>

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab 
              icon={<CalendarToday />} 
              label="Günlük" 
              iconPosition="start"
            />
            <Tab 
              icon={<DateRange />} 
              label="Haftalık" 
              iconPosition="start"
            />
            <Tab 
              icon={<TrendingUp />} 
              label="Aylık" 
              iconPosition="start"
            />
          </Tabs>
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        )}

        {/* Günlük Rapor */}
        {activeTab === 0 && dailyReport && !loading && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
              <TextField
                type="date"
                label="Tarih Seç"
                value={selectedDate}
                onChange={(e) => handleDateChange(e.target.value)}
                size="small"
              />
              <Button 
                variant="outlined" 
                onClick={() => fetchDailyReport()}
                size="small"
              >
                Bugün
              </Button>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {formatDate(dailyReport.date)} - Günlük Özet
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h4" color="primary">
                        {dailyReport.totalAmount} ml
                      </Typography>
                      <Typography color="text.secondary">
                        Hedef: {dailyReport.goal} ml
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(dailyReport.percentage, 100)}
                      sx={{ height: 20, borderRadius: 10, mb: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      %{dailyReport.percentage} tamamlandı
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Su Kayıtları
                    </Typography>
                    {dailyReport.logs.length === 0 ? (
                      <Typography color="text.secondary">
                        Bu gün için su kaydı yok
                      </Typography>
                    ) : (
                      <List>
                        {dailyReport.logs.map((log, index) => (
                          <ListItem key={log.id} sx={{ px: 0 }}>
                            <ListItemText
                              primary={`+${log.amount} ml`}
                              secondary={new Date(log.createdAt).toLocaleTimeString('tr-TR')}
                            />
                            <Chip 
                              label={`#${index + 1}`} 
                              size="small" 
                              color="primary" 
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Haftalık Rapor */}
        {activeTab === 1 && weeklyReport && !loading && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
              <TextField
                type="date"
                label="Hafta Seç"
                value={selectedWeek}
                onChange={(e) => handleWeekChange(e.target.value)}
                size="small"
              />
              <Button 
                variant="outlined" 
                onClick={() => fetchWeeklyReport()}
                size="small"
              >
                Bu Hafta
              </Button>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Haftalık Özet ({formatDate(weeklyReport.startDate)} - {formatDate(weeklyReport.endDate)})
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h4" color="primary">
                        {weeklyReport.totalAmount} ml
                      </Typography>
                      <Typography color="text.secondary">
                        Hedef: {weeklyReport.goal} ml
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(weeklyReport.percentage, 100)}
                      sx={{ height: 20, borderRadius: 10, mb: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      %{weeklyReport.percentage} tamamlandı
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Günlük Dağılım
                    </Typography>
                    <List>
                      {Object.entries(weeklyReport.dailyData).map(([date, amount]) => (
                        <ListItem key={date} sx={{ px: 0 }}>
                          <ListItemText
                            primary={getDayName(date)}
                            secondary={formatDate(date)}
                          />
                          <Chip 
                            label={`${amount} ml`} 
                            size="small" 
                            color={amount > 0 ? 'primary' : 'default'}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}

        {/* Aylık Rapor */}
        {activeTab === 2 && monthlyReport && !loading && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Ay</InputLabel>
                <Select
                  value={selectedMonth}
                  onChange={(e) => handleMonthYearChange(e.target.value, selectedYear)}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <MenuItem key={i + 1} value={i + 1}>
                      {new Date(0, i).toLocaleString('tr-TR', { month: 'long' })}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>Yıl</InputLabel>
                <Select
                  value={selectedYear}
                  onChange={(e) => handleMonthYearChange(selectedMonth, e.target.value)}
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - 2 + i;
                    return (
                      <MenuItem key={year} value={year}>
                        {year}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
              <Button 
                variant="outlined" 
                onClick={() => fetchMonthlyReport()}
                size="small"
              >
                Bu Ay
              </Button>
            </Box>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Aylık Özet ({monthlyReport.year} - {monthlyReport.month})
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h4" color="primary">
                        {monthlyReport.totalAmount} ml
                      </Typography>
                      <Typography color="text.secondary">
                        Hedef: {monthlyReport.goal} ml
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={Math.min(monthlyReport.percentage, 100)}
                      sx={{ height: 20, borderRadius: 10, mb: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      %{monthlyReport.percentage} tamamlandı
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Haftalık Dağılım
                    </Typography>
                    <List>
                      {Object.entries(monthlyReport.weeklyData).map(([week, amount]) => (
                        <ListItem key={week} sx={{ px: 0 }}>
                          <ListItemText
                            primary={week}
                            secondary={`${amount} ml`}
                          />
                          <Chip 
                            label={`${amount} ml`} 
                            size="small" 
                            color={amount > 0 ? 'primary' : 'default'}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default Reports;
