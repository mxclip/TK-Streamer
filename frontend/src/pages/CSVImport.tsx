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
  price: string;
  details: string;
  conditions: string;
}

interface UploadResult {
  success: boolean;
  message: string;
  successful?: number;
  failed?: number;
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
              price: values[2] || '',
              details: values[3] || '',
              conditions: values[4] || '',
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
              name: row[0]?.toString() || '',
              brand: row[1]?.toString() || '',
              price: row[2]?.toString() || '',
              details: row[3]?.toString() || '',
              conditions: row[4]?.toString() || '',
            });
          }
        }
        setCsvData(parsedData);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await fetch('http://localhost:8000/api/v1/bags/import-csv', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      const result = await response.json();
      
      if (response.ok) {
        setUploadResult({
          success: true,
          message: result.message || `Successfully imported ${result.successful} items`,
          successful: result.successful,
          failed: result.failed,
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

  const downloadTemplate = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/bags/template', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'bag_import_template.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Error downloading template:', error);
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
          onClick={downloadTemplate}
        >
          Download Template
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
          {uploadResult.successful !== undefined && uploadResult.failed !== undefined && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Successful: {uploadResult.successful}, Failed: {uploadResult.failed}
            </Typography>
          )}
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
            {['name', 'brand', 'price', 'details', 'conditions'].map((column) => (
              <Chip key={column} label={column} variant="outlined" size="small" />
            ))}
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            <strong>Example:</strong><br />
            name: Classic Flap Medium<br />
            brand: Chanel<br />
            price: 7500<br />
            details: Quilted caviar leather, gold hardware<br />
            conditions: Excellent
          </Typography>
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
                  <TableCell>Price</TableCell>
                  <TableCell>Details</TableCell>
                  <TableCell>Conditions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {csvData.slice(0, 10).map((row, index) => (
                  <TableRow key={index}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell>{row.brand}</TableCell>
                    <TableCell>${row.price}</TableCell>
                    <TableCell>{row.details}</TableCell>
                    <TableCell>
                      <Chip 
                        label={row.conditions}
                        color="primary"
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