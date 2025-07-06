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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Tooltip,
  InputAdornment,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  FilterList,
  Inventory,
  MonetizationOn,
  Verified,
  Warning,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

interface Bag {
  id: number;
  name: string;
  brand: string;
  color: string;
  details: string;
  price: number;
  condition: string;
  authenticity_verified: boolean;
  created_at: string;
  updated_at: string;
}

const Bags: React.FC = () => {
  const { token } = useAuth();
  const [bags, setBags] = useState<Bag[]>([]);
  const [filteredBags, setFilteredBags] = useState<Bag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [conditionFilter, setConditionFilter] = useState('');
  const [verifiedFilter, setVerifiedFilter] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [editingBag, setEditingBag] = useState<Bag | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [bagToDelete, setBagToDelete] = useState<Bag | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    color: '',
    details: '',
    price: '',
    condition: 'excellent',
    authenticity_verified: true,
  });

  useEffect(() => {
    fetchBags();
  }, []);

  useEffect(() => {
    filterBags();
  }, [bags, searchTerm, brandFilter, conditionFilter, verifiedFilter]);

  const fetchBags = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:8000/api/v1/bags', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (response.ok) {
        const data = await response.json();
        setBags(data);
        setError(null);
      } else {
        setError('Failed to load bags');
      }
    } catch (err) {
      setError('Network error. Please check if the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const filterBags = () => {
    let filtered = bags;

    if (searchTerm) {
      filtered = filtered.filter(bag =>
        bag.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bag.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bag.color.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (brandFilter) {
      filtered = filtered.filter(bag => bag.brand === brandFilter);
    }

    if (conditionFilter) {
      filtered = filtered.filter(bag => bag.condition === conditionFilter);
    }

    if (verifiedFilter) {
      filtered = filtered.filter(bag => 
        verifiedFilter === 'verified' ? bag.authenticity_verified : !bag.authenticity_verified
      );
    }

    setFilteredBags(filtered);
  };

  const handleOpenDialog = (bag?: Bag) => {
    if (bag) {
      setEditingBag(bag);
      setFormData({
        name: bag.name,
        brand: bag.brand,
        color: bag.color,
        details: bag.details,
        price: bag.price.toString(),
        condition: bag.condition,
        authenticity_verified: bag.authenticity_verified,
      });
    } else {
      setEditingBag(null);
      setFormData({
        name: '',
        brand: '',
        color: '',
        details: '',
        price: '',
        condition: 'excellent',
        authenticity_verified: true,
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingBag(null);
  };

  const handleSubmit = async () => {
    try {
      const bagData = {
        ...formData,
        price: parseFloat(formData.price),
      };

      const url = editingBag 
        ? `http://localhost:8000/api/v1/bags/${editingBag.id}`
        : 'http://localhost:8000/api/v1/bags/';
      
      const method = editingBag ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bagData),
      });

      if (response.ok) {
        await fetchBags();
        handleCloseDialog();
      } else {
        const error = await response.json();
        setError(error.detail || 'Failed to save bag');
      }
    } catch (err) {
      setError('Network error. Please check if the backend is running.');
    }
  };

  const handleDeleteClick = (bag: Bag) => {
    setBagToDelete(bag);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!bagToDelete) return;

    try {
      const response = await fetch(`http://localhost:8000/api/v1/bags/${bagToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        await fetchBags();
        setDeleteConfirmOpen(false);
        setBagToDelete(null);
      } else {
        const error = await response.json();
        setError(error.detail || 'Failed to delete bag');
      }
    } catch (err) {
      setError('Network error. Please check if the backend is running.');
    }
  };

  const uniqueBrands = Array.from(new Set(bags.map(bag => bag.brand)));
  const uniqueConditions = Array.from(new Set(bags.map(bag => bag.condition)));

  const getConditionColor = (condition: string) => {
    switch (condition.toLowerCase()) {
      case 'excellent': return 'success';
      case 'very good': return 'info';
      case 'good': return 'warning';
      case 'fair': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box>
        <Typography>Loading bags...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Bags Inventory
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your luxury bags collection
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Add New Bag
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
                <Inventory sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{bags.length}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Bags</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <MonetizationOn sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    ${bags.reduce((sum, bag) => sum + bag.price, 0).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Total Value</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Verified sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {bags.filter(bag => bag.authenticity_verified).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Verified</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Warning sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {bags.filter(bag => !bag.authenticity_verified).length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Unverified</Typography>
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
                placeholder="Search bags..."
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
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Brand</InputLabel>
                <Select
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  label="Brand"
                >
                  <MenuItem value="">All Brands</MenuItem>
                  {uniqueBrands.map(brand => (
                    <MenuItem key={brand} value={brand}>{brand}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Condition</InputLabel>
                <Select
                  value={conditionFilter}
                  onChange={(e) => setConditionFilter(e.target.value)}
                  label="Condition"
                >
                  <MenuItem value="">All Conditions</MenuItem>
                  {uniqueConditions.map(condition => (
                    <MenuItem key={condition} value={condition}>{condition}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={verifiedFilter}
                  onChange={(e) => setVerifiedFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All Status</MenuItem>
                  <MenuItem value="verified">Verified</MenuItem>
                  <MenuItem value="unverified">Unverified</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                onClick={() => {
                  setSearchTerm('');
                  setBrandFilter('');
                  setConditionFilter('');
                  setVerifiedFilter('');
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
              <TableCell>Name</TableCell>
              <TableCell>Brand</TableCell>
              <TableCell>Color</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Condition</TableCell>
              <TableCell>Verified</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredBags.map((bag) => (
              <TableRow key={bag.id}>
                <TableCell>
                  <Typography variant="subtitle2">{bag.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {bag.details}
                  </Typography>
                </TableCell>
                <TableCell>{bag.brand}</TableCell>
                <TableCell>{bag.color}</TableCell>
                <TableCell>${bag.price.toLocaleString()}</TableCell>
                <TableCell>
                  <Chip
                    label={bag.condition}
                    color={getConditionColor(bag.condition) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={bag.authenticity_verified ? 'Verified' : 'Unverified'}
                    color={bag.authenticity_verified ? 'success' : 'warning'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title="Edit">
                    <IconButton onClick={() => handleOpenDialog(bag)}>
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton onClick={() => handleDeleteClick(bag)}>
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredBags.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No bags found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {bags.length === 0 ? 'Add your first bag to get started' : 'Try adjusting your search criteria'}
          </Typography>
        </Box>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingBag ? 'Edit Bag' : 'Add New Bag'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Brand"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Condition</InputLabel>
                <Select
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  label="Condition"
                >
                  <MenuItem value="excellent">Excellent</MenuItem>
                  <MenuItem value="very good">Very Good</MenuItem>
                  <MenuItem value="good">Good</MenuItem>
                  <MenuItem value="fair">Fair</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.authenticity_verified}
                    onChange={(e) => setFormData({ ...formData, authenticity_verified: e.target.checked })}
                  />
                }
                label="Authenticity Verified"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Details"
                multiline
                rows={3}
                value={formData.details}
                onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                placeholder="Additional details about the bag..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingBag ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{bagToDelete?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Bags; 