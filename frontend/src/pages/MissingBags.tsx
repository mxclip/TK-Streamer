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
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  Warning,
  CheckCircle,
  Error,
  Info,
  Visibility,
  Update,
  FindInPage,
  ShoppingCart,
  Inventory,
  Schedule,
  LocationOn,
} from '@mui/icons-material';

interface MissingItem {
  id: number;
  name: string;
  brand: string;
  expected_location: string;
  last_seen: string;
  status: 'missing' | 'investigating' | 'found' | 'lost';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimated_value: number;
  description: string;
  created_at: string;
  updated_at: string;
  notes: string;
}

interface SearchResult {
  location: string;
  probability: number;
  last_scanned: string;
  confidence: 'high' | 'medium' | 'low';
}

const MissingBags: React.FC = () => {
  const [missingItems, setMissingItems] = useState<MissingItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MissingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [searchDialog, setSearchDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<MissingItem | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MissingItem | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchingItem, setSearchingItem] = useState<MissingItem | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    expected_location: '',
    last_seen: '',
    status: 'missing',
    priority: 'medium',
    estimated_value: 0,
    description: '',
    notes: '',
  });

  const statuses = [
    { value: 'missing', label: 'Missing', color: 'error' },
    { value: 'investigating', label: 'Investigating', color: 'warning' },
    { value: 'found', label: 'Found', color: 'success' },
    { value: 'lost', label: 'Lost', color: 'default' },
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'default' },
    { value: 'medium', label: 'Medium', color: 'info' },
    { value: 'high', label: 'High', color: 'warning' },
    { value: 'urgent', label: 'Urgent', color: 'error' },
  ];

  useEffect(() => {
    fetchMissingItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [missingItems, searchTerm, statusFilter, priorityFilter]);

  const fetchMissingItems = async () => {
    try {
      setLoading(true);
      // Mock data for demonstration
      const mockData: MissingItem[] = [
        {
          id: 1,
          name: 'Hermès Birkin 30',
          brand: 'Hermès',
          expected_location: 'Warehouse A - Shelf 12',
          last_seen: '2024-01-15T10:30:00Z',
          status: 'missing',
          priority: 'high',
          estimated_value: 15000,
          description: 'Black Togo leather with gold hardware',
          created_at: '2024-01-16T09:00:00Z',
          updated_at: '2024-01-16T09:00:00Z',
          notes: 'Item was supposed to be featured in today\'s livestream',
        },
        {
          id: 2,
          name: 'Chanel Classic Flap',
          brand: 'Chanel',
          expected_location: 'Display Case 3',
          last_seen: '2024-01-14T14:20:00Z',
          status: 'investigating',
          priority: 'medium',
          estimated_value: 8500,
          description: 'Navy quilted lambskin with silver chain',
          created_at: '2024-01-15T11:15:00Z',
          updated_at: '2024-01-15T16:30:00Z',
          notes: 'Customer inquired about this item, checking with team',
        },
        {
          id: 3,
          name: 'Louis Vuitton Neverfull MM',
          brand: 'Louis Vuitton',
          expected_location: 'Storage Room B',
          last_seen: '2024-01-13T09:45:00Z',
          status: 'found',
          priority: 'low',
          estimated_value: 1800,
          description: 'Monogram canvas with leather trim',
          created_at: '2024-01-14T08:30:00Z',
          updated_at: '2024-01-16T12:00:00Z',
          notes: 'Found in the return processing area',
        },
        {
          id: 4,
          name: 'Gucci Dionysus',
          brand: 'Gucci',
          expected_location: 'Warehouse A - Shelf 8',
          last_seen: '2024-01-12T16:10:00Z',
          status: 'missing',
          priority: 'urgent',
          estimated_value: 3200,
          description: 'Black leather with tiger head closure',
          created_at: '2024-01-13T10:00:00Z',
          updated_at: '2024-01-13T10:00:00Z',
          notes: 'High-priority item for VIP customer',
        },
      ];
      setMissingItems(mockData);
      setError(null);
    } catch (err) {
      setError('Failed to load missing items');
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = missingItems;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter) {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    if (priorityFilter) {
      filtered = filtered.filter(item => item.priority === priorityFilter);
    }

    setFilteredItems(filtered);
  };

  const handleOpenDialog = (item?: MissingItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        brand: item.brand,
        expected_location: item.expected_location,
        last_seen: item.last_seen,
        status: item.status,
        priority: item.priority,
        estimated_value: item.estimated_value,
        description: item.description,
        notes: item.notes,
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        brand: '',
        expected_location: '',
        last_seen: '',
        status: 'missing',
        priority: 'medium',
        estimated_value: 0,
        description: '',
        notes: '',
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingItem(null);
  };

  const handleSubmit = () => {
    // In a real app, this would make an API call
    console.log('Saving missing item:', formData);
    handleCloseDialog();
  };

  const handleDeleteClick = (item: MissingItem) => {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    console.log('Deleting item:', itemToDelete);
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  const handleSearchItem = (item: MissingItem) => {
    setSearchingItem(item);
    // Mock search results
    const mockResults: SearchResult[] = [
      { location: 'Warehouse A - Shelf 15', probability: 85, last_scanned: '2024-01-16T08:30:00Z', confidence: 'high' },
      { location: 'Display Case 5', probability: 62, last_scanned: '2024-01-16T07:15:00Z', confidence: 'medium' },
      { location: 'Storage Room C', probability: 38, last_scanned: '2024-01-15T18:45:00Z', confidence: 'low' },
      { location: 'Return Processing', probability: 25, last_scanned: '2024-01-15T16:20:00Z', confidence: 'low' },
    ];
    setSearchResults(mockResults);
    setSearchDialog(true);
  };

  const getStatusColor = (status: string) => {
    const statusObj = statuses.find(s => s.value === status);
    return statusObj ? statusObj.color : 'default';
  };

  const getPriorityColor = (priority: string) => {
    const priorityObj = priorities.find(p => p.value === priority);
    return priorityObj ? priorityObj.color : 'default';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'missing': return <Error color="error" />;
      case 'investigating': return <Warning color="warning" />;
      case 'found': return <CheckCircle color="success" />;
      case 'lost': return <Info color="disabled" />;
      default: return <Info />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getTotalValue = () => {
    return missingItems.reduce((sum, item) => sum + item.estimated_value, 0);
  };

  const getUrgentCount = () => {
    return missingItems.filter(item => item.priority === 'urgent' && item.status === 'missing').length;
  };

  if (loading) {
    return (
      <Box>
        <Typography>Loading missing items...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Missing Bags
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Track and manage missing inventory items
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
        >
          Report Missing Item
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
                <Inventory sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{missingItems.length}</Typography>
                  <Typography variant="body2" color="text.secondary">Total Missing</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Error sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{getUrgentCount()}</Typography>
                  <Typography variant="body2" color="text.secondary">Urgent</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <ShoppingCart sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{formatCurrency(getTotalValue())}</Typography>
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
                <CheckCircle sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">
                    {missingItems.filter(item => item.status === 'found').length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">Found</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quick Actions
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="outlined"
              startIcon={<FindInPage />}
              onClick={() => {
                // In a real app, this would trigger a system-wide search
                console.log('Starting system-wide search...');
              }}
            >
              System Search
            </Button>
            <Button
              variant="outlined"
              startIcon={<Update />}
              onClick={() => {
                // In a real app, this would sync with inventory systems
                console.log('Syncing with inventory...');
              }}
            >
              Sync Inventory
            </Button>
            <Button
              variant="outlined"
              startIcon={<Schedule />}
              onClick={() => {
                // In a real app, this would generate a report
                console.log('Generating report...');
              }}
            >
              Generate Report
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                placeholder="Search missing items..."
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
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All Status</MenuItem>
                  {statuses.map(status => (
                    <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  label="Priority"
                >
                  <MenuItem value="">All Priorities</MenuItem>
                  {priorities.map(priority => (
                    <MenuItem key={priority.value} value={priority.value}>{priority.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                variant="outlined"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setPriorityFilter('');
                }}
              >
                Clear
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Missing Items Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell>Expected Location</TableCell>
              <TableCell>Last Seen</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>Value</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredItems.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {getStatusIcon(item.status)}
                    <Box sx={{ ml: 2 }}>
                      <Typography variant="subtitle2">{item.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {item.brand} • {item.description}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <LocationOn sx={{ fontSize: 16, color: 'text.secondary', mr: 1 }} />
                    <Typography variant="body2">{item.expected_location}</Typography>
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{formatDate(item.last_seen)}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={item.status}
                    color={getStatusColor(item.status) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={item.priority}
                    color={getPriorityColor(item.priority) as any}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{formatCurrency(item.estimated_value)}</Typography>
                </TableCell>
                <TableCell>
                  <Tooltip title="Search">
                    <IconButton onClick={() => handleSearchItem(item)}>
                      <Search />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <IconButton onClick={() => handleOpenDialog(item)}>
                      <Edit />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton onClick={() => handleDeleteClick(item)}>
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {filteredItems.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No missing items found
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {missingItems.length === 0 ? 'Great! No missing items to report' : 'Try adjusting your search criteria'}
          </Typography>
        </Box>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingItem ? 'Edit Missing Item' : 'Report Missing Item'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Item Name"
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
                label="Expected Location"
                value={formData.expected_location}
                onChange={(e) => setFormData({ ...formData, expected_location: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Last Seen"
                type="datetime-local"
                value={formData.last_seen}
                onChange={(e) => setFormData({ ...formData, last_seen: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  label="Status"
                >
                  {statuses.map(status => (
                    <MenuItem key={status.value} value={status.value}>{status.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  label="Priority"
                >
                  {priorities.map(priority => (
                    <MenuItem key={priority.value} value={priority.value}>{priority.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Estimated Value"
                type="number"
                value={formData.estimated_value}
                onChange={(e) => setFormData({ ...formData, estimated_value: parseFloat(e.target.value) })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                multiline
                rows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                multiline
                rows={3}
                placeholder="Additional notes or details..."
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingItem ? 'Update' : 'Report'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Search Results Dialog */}
      <Dialog open={searchDialog} onClose={() => setSearchDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Search Results for "{searchingItem?.name}"
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Possible locations based on system scans and inventory data
          </Typography>
          <List>
            {searchResults.map((result, index) => (
              <ListItem key={index}>
                <ListItemText
                  primary={result.location}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="text.secondary">
                        Last scanned: {formatDate(result.last_scanned)}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                        <Typography variant="body2" sx={{ mr: 1 }}>
                          Confidence: {result.confidence}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={result.probability}
                          sx={{ flexGrow: 1, mr: 1 }}
                          color={result.confidence === 'high' ? 'success' : result.confidence === 'medium' ? 'warning' : 'error'}
                        />
                        <Typography variant="body2">
                          {result.probability}%
                        </Typography>
                      </Box>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => {
                      console.log('Checking location:', result.location);
                    }}
                  >
                    Check
                  </Button>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSearchDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{itemToDelete?.name}"? This action cannot be undone.
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

export default MissingBags; 