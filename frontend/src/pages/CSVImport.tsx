import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Alert,
  LinearProgress,
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
} from '@mui/material';
import {
  CloudUpload,
  Download,
  Delete,
  Preview,
  CheckCircle,
  Error,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import { useAuth } from '../contexts/AuthContext';

interface CSVRow {
  name: string;
  brand: string;
  color: string;
  details: string;
  price: string;
  condition: string;
  authenticity_verified: string;
}

interface UploadResult {
  success: boolean;
  message: string;
  imported_count?: number;
  errors?: string[];
}

const CSVImport: React.FC = () => {
  const { token } = useAuth();
  const [csvData, setCsvData] = useState<CSVRow[]>([]);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setSelectedFile(file);
      parseFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxFiles: 1,
  });

  const parseFile = (file: File) => {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'csv') {
      parseCSV(file);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      parseExcel(file);
    }
  };

  const parseCSV = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const data: CSVRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim()) {
          const values = lines[i].split(',').map(v => v.trim());
          if (values.length >= headers.length) {
            data.push({
              name: values[0] || '',
              brand: values[1] || '',
              color: values[2] || '',
              details: values[3] || '',
              price: values[4] || '',
              condition: values[5] || '',
              authenticity_verified: values[6] || '',
            });
          }
        }
      }
      setCsvData(data);
    };
    reader.readAsText(file);
  };

  const parseExcel = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][];
      
      if (jsonData.length > 1) {
        const parsedData: CSVRow[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row && row.length > 0 && row[0]) { // Skip empty rows
            parsedData.push({
              name: row[0] || '',
              brand: row[1] || '',
              color: row[2] || '',
              details: row[3] || '',
              price: row[4] || '',
              condition: row[5] || '',
              authenticity_verified: row[6] || '',
            });
          }
        }
        setCsvData(parsedData);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUpload = async () => {
    if (!csvData.length) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const response = await fetch('http://localhost:8000/api/v1/bags/import-csv', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bags: csvData }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setUploadResult({
          success: true,
          message: `Successfully imported ${result.imported_count || csvData.length} items`,
          imported_count: result.imported_count || csvData.length,
        });
        setCsvData([]);
        setSelectedFile(null);
      } else {
        setUploadResult({
          success: false,
          message: result.detail || 'Upload failed',
          errors: result.errors || [],
        });
      }
    } catch (error) {
      setUploadResult({
        success: false,
        message: 'Network error. Please check if the backend is running.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const downloadTemplate = (format: 'csv' | 'excel' = 'excel') => {
    const template = [
      ['name', 'brand', 'color', 'details', 'price', 'condition', 'authenticity_verified'],
      ['Hermès Birkin 35', 'Hermès', 'Black', 'Togo leather with gold hardware', '12000', 'excellent', 'true'],
      ['Chanel Classic Flap', 'Chanel', 'Navy', 'Quilted lambskin with silver chain', '8500', 'very good', 'true'],
      ['Louis Vuitton Neverfull', 'Louis Vuitton', 'Brown', 'Monogram canvas with leather trim', '1200', 'good', 'true'],
    ];
    
    if (format === 'excel') {
      const worksheet = XLSX.utils.aoa_to_sheet(template);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Bags Template');
      XLSX.writeFile(workbook, 'bags_template.xlsx');
    } else {
      const csvContent = template.map(row => row.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bags_template.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  const clearData = () => {
    setCsvData([]);
    setSelectedFile(null);
    setUploadResult(null);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        File Import
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Import your luxury bags inventory from CSV or Excel files
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box
            {...getRootProps()}
            sx={{
              border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: isDragActive ? 'action.hover' : 'transparent',
              transition: 'all 0.3s ease',
            }}
          >
            <input {...getInputProps()} />
            <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {isDragActive ? 'Drop the file here' : 'Drag and drop a CSV or Excel file here'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Supported formats: .csv, .xlsx, .xls
            </Typography>
            <Button variant="outlined" component="span">
              Select File
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<Download />}
          onClick={() => downloadTemplate('excel')}
        >
          Download Template (Excel)
        </Button>
        {csvData.length > 0 && (
          <>
            <Button
              variant="outlined"
              startIcon={<Preview />}
              onClick={() => setPreviewOpen(true)}
            >
              Preview Data ({csvData.length} items)
            </Button>
            <Button
              variant="outlined"
              startIcon={<Delete />}
              onClick={clearData}
            >
              Clear Data
            </Button>
            <Button
              variant="contained"
              startIcon={<CheckCircle />}
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? 'Uploading...' : 'Import Data'}
            </Button>
          </>
        )}
      </Box>

      {isUploading && (
        <Box sx={{ mb: 3 }}>
          <LinearProgress />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Importing {csvData.length} items...
          </Typography>
        </Box>
      )}

      {uploadResult && (
        <Alert 
          severity={uploadResult.success ? 'success' : 'error'} 
          sx={{ mb: 3 }}
          action={
            uploadResult.success ? (
              <IconButton size="small" onClick={() => setUploadResult(null)}>
                <Delete />
              </IconButton>
            ) : undefined
          }
        >
          {uploadResult.message}
          {uploadResult.errors && uploadResult.errors.length > 0 && (
            <Box component="ul" sx={{ mt: 1, mb: 0 }}>
              {uploadResult.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </Box>
          )}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            File Format Requirements
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Your CSV or Excel file should have the following columns in order:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {['name', 'brand', 'color', 'details', 'price', 'condition', 'authenticity_verified'].map((column) => (
              <Chip key={column} label={column} variant="outlined" size="small" />
            ))}
          </Box>
        </CardContent>
      </Card>

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="lg" fullWidth>
        <DialogTitle>Preview Import Data</DialogTitle>
        <DialogContent>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Brand</TableCell>
                  <TableCell>Color</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Condition</TableCell>
                  <TableCell>Verified</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {csvData.slice(0, 10).map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.brand}</TableCell>
                    <TableCell>{row.color}</TableCell>
                    <TableCell>${row.price}</TableCell>
                    <TableCell>{row.condition}</TableCell>
                    <TableCell>
                      <Chip 
                        label={row.authenticity_verified === 'true' ? 'Yes' : 'No'}
                        color={row.authenticity_verified === 'true' ? 'success' : 'warning'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {csvData.length > 10 && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              Showing first 10 rows of {csvData.length} total items
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CSVImport; 