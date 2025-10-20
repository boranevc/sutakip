import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  TextField,
  Box,
  LinearProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add,
  WaterDrop,
  People,
  Delete,
  Edit,
  BarChart
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const Dashboard = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [waterAmount, setWaterAmount] = useState(250);
  const [waterHistory, setWaterHistory] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [newGoal, setNewGoal] = useState(user?.dailyWaterGoal || 2000);
  const [error, setError] = useState('');

  // Su ekleme fonksiyonu
  const addWater = async (amount) => {
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post('/api/water', { amount });
      updateUser({ ...user, currentWaterIntake: response.data.newTotal });
      
      // Su geçmişini ve kullanıcı listesini güncelle
      await Promise.all([
        fetchWaterHistory(),
        fetchAllUsers()
      ]);
      
      setLoading(false);
    } catch (error) {
      setError('Su eklenirken hata oluştu');
      setLoading(false);
    }
  };

  // Su geçmişini getir
  const fetchWaterHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await axios.get('/api/water/history');
      setWaterHistory(response.data);
    } catch (error) {
      console.error('Geçmiş yüklenirken hata:', error);
    }
    setHistoryLoading(false);
  };

  // Tüm kullanıcıları getir
  const fetchAllUsers = async () => {
    try {
      const response = await axios.get('/api/users');
      setAllUsers(response.data);
    } catch (error) {
      console.error('Kullanıcılar yüklenirken hata:', error);
    }
  };

  // Su kaydı silme
  const deleteWaterLog = async (logId) => {
    try {
      // Güvenlik kontrolü: Sadece kendi su kayıtlarını silebilir
      const logToDelete = waterHistory.find(log => log.id === logId);
      if (!logToDelete) {
        setError('Bu su kaydı bulunamadı');
        return;
      }
      
      console.log('Su kaydı silme isteği:', { logId, currentUser: user?.id });
      
      const response = await axios.delete(`/api/water/${logId}`);
      updateUser({ ...user, currentWaterIntake: response.data.newTotal });
      
      // Su geçmişini ve kullanıcı listesini güncelle
      await Promise.all([
        fetchWaterHistory(),
        fetchAllUsers()
      ]);
      
      setError(''); // Başarılı silme
    } catch (error) {
      console.error('Su kaydı silme hatası:', error);
      setError(`Su kaydı silinirken hata oluştu: ${error.response?.data?.message || error.message}`);
    }
  };

  // Günlük hedef güncelleme
  const updateGoal = async () => {
    try {
      await axios.put('/api/goal', { goal: newGoal });
      updateUser({ ...user, dailyWaterGoal: newGoal });
      setGoalDialogOpen(false);
    } catch (error) {
      setError('Hedef güncellenirken hata oluştu');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setUsersLoading(true);
      setHistoryLoading(true);
      
      await Promise.all([
        fetchWaterHistory(),
        fetchAllUsers()
      ]);
      
      setUsersLoading(false);
      setHistoryLoading(false);
    };
    
    loadData();
  }, []);

  const progressPercentage = user ? (user.currentWaterIntake / user.dailyWaterGoal) * 100 : 0;
  const remainingWater = user ? Math.max(0, user.dailyWaterGoal - user.currentWaterIntake) : 0;

  const quickAmounts = [100, 250, 500, 750];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Ana Su Takip Kartı */}
        <Grid item xs={12} md={8}>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <WaterDrop sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
              <Typography variant="h4" component="h1" sx={{ fontWeight: 'bold' }}>
                Su Takip
              </Typography>
            </Box>

            {/* Günlük İlerleme */}
            <Box sx={{ mb: 4 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="h6">
                  Bugün: {user?.currentWaterIntake || 0} ml
                </Typography>
                <Typography variant="h6" color="primary">
                  Hedef: {user?.dailyWaterGoal || 2000} ml
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={Math.min(progressPercentage, 100)}
                sx={{ height: 20, borderRadius: 10, mb: 2 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="body2" color="text.secondary">
                  %{Math.round(progressPercentage)} tamamlandı
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {remainingWater} ml kaldı
                </Typography>
              </Box>
            </Box>

            {/* Su Ekleme */}
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Su Ekle
              </Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                {quickAmounts.map((amount) => (
                  <Grid item xs={6} sm={3} key={amount}>
                    <Button
                      variant="outlined"
                      fullWidth
                      onClick={() => addWater(amount)}
                      disabled={loading}
                      sx={{ py: 1.5 }}
                    >
                      +{amount} ml
                    </Button>
                  </Grid>
                ))}
              </Grid>
              
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                <TextField
                  type="number"
                  label="Özel Miktar (ml)"
                  value={waterAmount}
                  onChange={(e) => setWaterAmount(parseInt(e.target.value) || 0)}
                  size="small"
                  sx={{ flexGrow: 1 }}
                />
                <Button
                  variant="contained"
                  onClick={() => addWater(waterAmount)}
                  disabled={loading || waterAmount <= 0}
                  startIcon={loading ? <CircularProgress size={20} /> : <Add />}
                >
                  Ekle
                </Button>
              </Box>
            </Box>

            {/* Hedef Güncelleme ve Raporlar */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="outlined"
                onClick={() => setGoalDialogOpen(true)}
                startIcon={<Edit />}
              >
                Günlük Hedefi Güncelle
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate('/reports')}
                startIcon={<BarChart />}
                color="secondary"
                sx={{ color: 'white' }}
              >
                Raporları Görüntüle
              </Button>
            </Box>
          </Paper>
        </Grid>

        {/* Yan Panel - Kullanıcılar */}
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <People sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                Diğer Kullanıcılar
              </Typography>
            </Box>
            
            {usersLoading ? (
              <CircularProgress />
            ) : (
              <List>
                {allUsers.slice(0, 5).map((otherUser) => (
                  <ListItem key={otherUser.id} sx={{ px: 0 }}>
                    <ListItemText
                      primary={otherUser.name}
                      secondary={`${otherUser.currentWaterIntake} ml`}
                    />
                    <ListItemSecondaryAction>
                      <Chip
                        label={`%${Math.round((otherUser.currentWaterIntake / otherUser.dailyWaterGoal) * 100)}`}
                        size="small"
                        color={otherUser.currentWaterIntake >= otherUser.dailyWaterGoal ? 'success' : 'primary'}
                      />
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Su Geçmişi */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
              Bugünkü Su Geçmişi
            </Typography>
            
            {historyLoading ? (
              <CircularProgress />
            ) : waterHistory.length === 0 ? (
              <Typography color="text.secondary">
                Henüz su kaydı yok. İlk suyunuzu ekleyin!
              </Typography>
            ) : (
              <List>
                {waterHistory.map((log) => (
                  <ListItem key={log.id} sx={{ px: 0 }}>
                    <ListItemText
                      primary={`+${log.amount} ml`}
                      secondary={new Date(log.createdAt).toLocaleTimeString('tr-TR')}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => deleteWaterLog(log.id)}
                        color="error"
                        size="small"
                      >
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Hedef Güncelleme Dialog */}
      <Dialog open={goalDialogOpen} onClose={() => setGoalDialogOpen(false)}>
        <DialogTitle>Günlük Hedef Güncelle</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Günlük Hedef (ml)"
            type="number"
            fullWidth
            variant="outlined"
            value={newGoal}
            onChange={(e) => setNewGoal(parseInt(e.target.value) || 2000)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGoalDialogOpen(false)}>İptal</Button>
          <Button onClick={updateGoal} variant="contained">Güncelle</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Dashboard;
