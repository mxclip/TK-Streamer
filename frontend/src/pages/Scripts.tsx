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
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fab,
  Divider,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  Assignment,
  PlayArrow,
  Visibility,
  FilterList,
  Schedule,
  Category,
  StarBorder,
  Star,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface Script {
  id: number;
  title: string;
  content: string;
  category: string;
  tags: string[];
  is_favorite: boolean;
  estimated_duration: number;
  created_at: string;
  updated_at: string;
}

const Scripts: React.FC = () => {
  const { token } = useAuth();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [filteredScripts, setFilteredScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [favoriteFilter, setFavoriteFilter] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [previewDialog, setPreviewDialog] = useState(false);
  const [editingScript, setEditingScript] = useState<Script | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [scriptToDelete, setScriptToDelete] = useState<Script | null>(null);
  const [previewScript, setPreviewScript] = useState<Script | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    tags: '',
    is_favorite: false,
    estimated_duration: 60,
  });

  const scriptCategories = [
    'general',
    'opening',
    'product-intro',
    'pricing',
    'authenticity',
    'closing',
    'interaction',
    'special-offer',
  ];

  useEffect(() => {
    fetchScripts();
  }, []);

  useEffect(() => {
    filterScripts();
  }, [scripts, searchTerm, categoryFilter, favoriteFilter]);

  const fetchScripts = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/v1/scripts', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setScripts(data);
        setError(null);
      } else {
        setError('Failed to load scripts');
      }
    } catch (err) {
      setError('Network error. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const filterScripts = () => {
    let filtered = scripts;

    if (searchTerm) {
      filtered = filtered.filter(script =>
        script.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        script.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
        script.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (categoryFilter) {
      filtered = filtered.filter(script => script.category === categoryFilter);
    }

    if (favoriteFilter) {
      filtered = filtered.filter(script => 
        favoriteFilter === 'favorites' ? script.is_favorite : !script.is_favorite
      );
    }

    setFilteredScripts(filtered);
  };

  const handleOpenDialog = (script?: Script) => {
    if (script) {
      setEditingScript(script);
      setFormData({
        title: script.title,
        content: script.content,
        category: script.category,
        tags: script.tags.join(', '),
        is_favorite: script.is_favorite,
        estimated_duration: script.estimated_duration,
      });
    } else {
      setEditingScript(null);
      setFormData({
        title: '',
        content: '',
        category: 'general',
        tags: '',
        is_favorite: false,
        estimated_duration: 60,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingScript(null);
  };

  const handleSubmit = async () => {
    try {
      const scriptData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag),
      };

      const url = editingScript 
        ? `http://localhost:8000/api/v1/scripts/${editingScript.id}`
        : 'http://localhost:8000/api/v1/scripts/';
      
      const method = editingScript ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scriptData),
      });

      if (response.ok) {
        await fetchScripts();
        handleCloseDialog();
      } else {
        const error = await response.json();
        setError(error.detail || 'Failed to save script');
      }
    } catch (err) {
      setError('Network error. Please check if the backend is running.');
    }
  };

  const handleDeleteClick = (script: Script) => {
    setScriptToDelete(script);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!scriptToDelete) return;

    try {
      const response = await fetch(`http://localhost:8000/api/v1/scripts/${scriptToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        await fetchScripts();
        setDeleteConfirmOpen(false);
        setScriptToDelete(null);
      } else {
        const error = await response.json();
        setError(error.detail || 'Failed to delete script');
      }
    } catch (err) {
      setError('Network error. Please check if the backend is running.');
    }
  };

  const handlePreview = (script: Script) => {
    setPreviewScript(script);
    setPreviewDialog(true);
  };

  const toggleFavorite = async (script: Script) => {
    try {
      const response = await fetch(`http://localhost:8000/api/v1/scripts/${script.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...script,
          is_favorite: !script.is_favorite,
        }),
      });

      if (response.ok) {
        await fetchScripts();
      } else {
        const error = await response.json();
        setError(error.detail || 'Failed to update favorite status');
      }
    } catch (err) {
      setError('Network error. Please check if the backend is running.');
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'general': 'default',
      'opening': 'primary',
      'product-intro': 'secondary',
      'pricing': 'success',
      'authenticity': 'info',
      'closing': 'warning',
      'interaction': 'error',
      'special-offer': 'success',
    };
    return colors[category] || 'default';
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const uniqueCategories = Array.from(new Set(scripts.map(script => script.category)));

  if (loading) {
    return (
      <Box>
        <Typography>Loading scripts...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Scripts Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your livestream scripts and talking points
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Create New Script
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Assignment sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{scripts.length}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Scripts</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Star sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {scripts.filter(script => script.is_favorite).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Favorites</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Schedule sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {formatDuration(scripts.reduce((sum, script) => sum + script.estimated_duration, 0))}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Total Duration</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Category sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{uniqueCategories.length}</Typography>
                  <Typography variant="body2" color="text.secondary">Categories</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search scripts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  label="Category"
                >
                  <MenuItem value="">All Categories</MenuItem>
                  {uniqueCategories.map(category => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Favorites</InputLabel>
                <Select
                  value={favoriteFilter}
                  onChange={(e) => setFavoriteFilter(e.target.value)}
                  label="Favorites"
                >
                  <MenuItem value="">All Scripts</MenuItem>
                  <MenuItem value="favorites">Favorites Only</MenuItem>
                  <MenuItem value="non-favorites">Non-Favorites</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => {
                  setSearchTerm('');
                  setCategoryFilter('');
                  setFavoriteFilter('');
                }}
              >
                Clear
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Title</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Tags</TableCell>
              <TableCell>Favorite</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredScripts.map((script) => (
              <TableRow key={script.id}>
                <TableCell>
                  <Typography variant="subtitle2">{script.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {script.content.substring(0, 100)}...
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={script.category}
                    color={getCategoryColor(script.category) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>{formatDuration(script.estimated_duration)}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {script.tags.slice(0, 3).map((tag, index) => (
                      <Chip key={index} label={tag} size="small" variant="outlined" />
                    ))}
                    {script.tags.length > 3 && (
                      <Chip label={`+${script.tags.length - 3}`} size="small" variant="outlined" />
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => toggleFavorite(script)}>
                    {script.is_favorite ? <Star color="warning" /> : <StarBorder />}
                  </IconButton>
                </TableCell>
                <TableCell>
                  <Tooltip title="Preview">
                    <IconButton onClick={() => handlePreview(script)}>
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton onClick={() => handleOpenDialog(script)}>
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton onClick={() => handleDeleteClick(script)}>
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredScripts.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No scripts found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {scripts.length === 0 ? 'Create your first script to get started' : 'Try adjusting your search criteria'}
          </Typography>
        </Box>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingScript ? 'Edit Script' : 'Create New Script'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  label="Category"
                >
                  {scriptCategories.map(category => (
                    <MenuItem key={category} value={category}>{category}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Tags (comma-separated)"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="luxury, bags, authentication"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Estimated Duration (seconds)"
                type="number"
                value={formData.estimated_duration}
                onChange={(e) => setFormData({ ...formData, estimated_duration: parseInt(e.target.value) })}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Script Content"
                multiline
                rows={8}
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Write your script content here..."
                required
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingScript ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={previewDialog} onClose={() => setPreviewDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PlayArrow />
            Script Preview: {previewScript?.title}
          </Box>
        </DialogTitle>
        <DialogContent>
          {previewScript && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Category
                  </Typography>
                  <Chip 
                    label={previewScript.category} 
                    color={getCategoryColor(previewScript.category) as any} 
                    size="small" 
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Duration
                  </Typography>
                  <Typography variant="body2">
                    {formatDuration(previewScript.estimated_duration)}
                  </Typography>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Tags
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {previewScript.tags.map((tag, index) => (
                      <Chip key={index} label={tag} size="small" variant="outlined" />
                    ))}
                  </Box>
                </Grid>
              </Grid>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {previewScript.content}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{scriptToDelete?.title}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Fab 
        color="primary" 
        aria-label="add script"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => handleOpenDialog()}
      >
        <Add />
      </Fab>
    </Box>
  );
};

export default Scripts; 