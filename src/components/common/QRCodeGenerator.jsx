import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { QrCode, Download } from 'lucide-react';

const QRCodeGenerator = ({ url, title = 'QR Code' }) => {
  const [qrDataUrl, setQrDataUrl] = useState('');

  useEffect(() => {
    generateQRCode();
  }, [url]);

  const generateQRCode = async () => {
    try {
      // Using a QR code API service
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`;
      setQrDataUrl(qrUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const handleDownload = () => {
    if (qrDataUrl) {
      const link = document.createElement('a');
      link.href = qrDataUrl;
      link.download = `${title.replace(/\s+/g, '-')}-qr-code.png`;
      link.click();
    }
  };

  if (!qrDataUrl) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--accent)]"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-surface-subtle rounded-xl">
      <div className="p-4 bg-white rounded-lg">
        <img src={qrDataUrl} alt="QR Code" className="w-48 h-48" />
      </div>
      <p className="text-sm text-secondary text-center max-w-xs break-all">{url}</p>
      <button
        onClick={handleDownload}
        className="btn btn-primary flex items-center gap-2"
      >
        <Download className="w-4 h-4" />
        Download QR Code
      </button>
    </div>
  );
};

export default QRCodeGenerator;

