import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Snackbar,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  QuestionAnswer,
  SmartToy,
  Chat,
  Settings,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface PhraseMapping {
  id: number;
  trigger_phrase: string;
  response_text: string;
  action_type: string;
  is_active: boolean;
  category: string;
  priority: number;
  usage_count: number;
}

const PhraseMapping: React.FC = () => {
  const { token } = useAuth();
  const [phraseMappings, setPhraseMappings] = useState<PhraseMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingMapping, setEditingMapping] = useState<PhraseMapping | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [mappingToDelete, setMappingToDelete] = useState<PhraseMapping | null>(null);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });
  
  const [formData, setFormData] = useState({
    trigger_phrase: '',
    response_text: '',
    action_type: 'response',
    category: 'general',
    priority: 1,
    is_active: true,
  });

  const actionTypes = ['response', 'highlight', 'script', 'discount', 'redirect'];
  const categories = ['general', 'pricing', 'authenticity', 'sizing', 'availability'];

  useEffect(() => {
    fetchPhraseMappings();
  }, []);

  const fetchPhraseMappings = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/v1/phrase-mappings', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch phrase mappings');
      }

      const data = await response.json();
      setPhraseMappings(data);
      setError(null);
    } catch (err) {
      setError('Failed to load phrase mappings');
      console.error('Error fetching phrase mappings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (mapping?: PhraseMapping) => {
    if (mapping) {
      setEditingMapping(mapping);
      setFormData({
        trigger_phrase: mapping.trigger_phrase,
        response_text: mapping.response_text,
        action_type: mapping.action_type,
        category: mapping.category,
        priority: mapping.priority,
        is_active: mapping.is_active,
      });
    } else {
      setEditingMapping(null);
      setFormData({
        trigger_phrase: '',
        response_text: '',
        action_type: 'response',
        category: 'general',
        priority: 1,
        is_active: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingMapping(null);
  };

  const handleSubmit = async () => {
    try {
      const url = editingMapping
        ? `http://localhost:8000/api/v1/phrase-mappings/${editingMapping.id}`
        : 'http://localhost:8000/api/v1/phrase-mappings';
      
      const method = editingMapping ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Failed to save phrase mapping');
      }

      const data = await response.json();
      
      if (editingMapping) {
        // Update existing mapping in state
        setPhraseMappings(prev => 
          prev.map(m => m.id === editingMapping.id ? data : m)
        );
        setSnackbar({
          open: true,
          message: 'Phrase mapping updated successfully',
          severity: 'success',
        });
      } else {
        // Add new mapping to state
        setPhraseMappings(prev => [...prev, data]);
        setSnackbar({
          open: true,
          message: 'Phrase mapping created successfully',
          severity: 'success',
        });
      }
      
      handleCloseDialog();
    } catch (err) {
      console.error('Error saving phrase mapping:', err);
      setSnackbar({
        open: true,
        message: 'Failed to save phrase mapping',
        severity: 'error',
      });
    }
  };

  const handleDeleteClick = (mapping: PhraseMapping) => {
    setMappingToDelete(mapping);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!mappingToDelete) return;
    
    try {
      const response = await fetch(`http://localhost:8000/api/v1/phrase-mappings/${mappingToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete phrase mapping');
      }

      // Remove from state
      setPhraseMappings(prev => prev.filter(m => m.id !== mappingToDelete.id));
      
      setSnackbar({
        open: true,
        message: 'Phrase mapping deleted successfully',
        severity: 'success',
      });
    } catch (err) {
      console.error('Error deleting phrase mapping:', err);
      setSnackbar({
        open: true,
        message: 'Failed to delete phrase mapping',
        severity: 'error',
      });
    } finally {
      setDeleteConfirmOpen(false);
      setMappingToDelete(null);
    }
  };

  const getActionColor = (actionType: string) => {
    const colors: { [key: string]: string } = {
      'response': 'primary',
      'highlight': 'warning',
      'script': 'info',
      'discount': 'success',
      'redirect': 'secondary',
    };
    return colors[actionType] || 'default';
  };

  if (loading) {
    return (
      <Box>
        <Typography>Loading phrase mappings...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Phrase Mapping
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Configure automated responses and actions for chat phrases
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add Mapping
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <QuestionAnswer sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{phraseMappings.length}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Mappings</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <SmartToy sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {phraseMappings.filter(m => m.is_active).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Active</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Chat sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {phraseMappings.reduce((sum, m) => sum + m.usage_count, 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Total Uses</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Settings sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {Array.from(new Set(phraseMappings.map(m => m.category))).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Categories</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Mappings Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Trigger Phrase</TableCell>
              <TableCell>Response</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Usage</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {phraseMappings.map((mapping) => (
              <TableRow key={mapping.id}>
                <TableCell>
                  <Typography variant="body2" fontWeight="bold">
                    {mapping.trigger_phrase}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" sx={{ maxWidth: 200 }}>
                    {mapping.response_text.substring(0, 50)}
                    {mapping.response_text.length > 50 && '...'}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={mapping.action_type}
                    color={getActionColor(mapping.action_type) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip label={mapping.category} variant="outlined" size="small" />
                </TableCell>
                <TableCell>
                  <Chip 
                    label={mapping.priority} 
                    color={mapping.priority === 1 ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{mapping.usage_count}</TableCell>
                <TableCell>
                  <Chip
                    label={mapping.is_active ? 'Active' : 'Inactive'}
                    color={mapping.is_active ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="Edit">
                    <IconButton onClick={() => handleOpenDialog(mapping)}>
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton onClick={() => handleDeleteClick(mapping)}>
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingMapping ? 'Edit Phrase Mapping' : 'Add New Phrase Mapping'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Trigger Phrase"
                value={formData.trigger_phrase}
                onChange={(e) => setFormData({ ...formData, trigger_phrase: e.target.value })}
                required
                placeholder="e.g., 'what's the price', 'is this authentic'"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Action Type</InputLabel>
                <Select
                  value={formData.action_type}
                  onChange={(e) => setFormData({ ...formData, action_type: e.target.value })}
                  label="Action Type"
                >
                  {actionTypes.map(type => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  label="Category"
                >
                  {categories.map(category => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Priority"
                type="number"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                inputProps={{ min: 1, max: 10 }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  />
                }
                label="Active"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Response Text"
                multiline
                rows={4}
                value={formData.response_text}
                onChange={(e) => setFormData({ ...formData, response_text: e.target.value })}
                placeholder="Enter the response text..."
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingMapping ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the phrase mapping for "{mappingToDelete?.trigger_phrase}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PhraseMapping; 