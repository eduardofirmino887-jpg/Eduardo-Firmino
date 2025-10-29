
import React from 'react';
import { Button } from './ui/Button'; // Import the Button component

type Header<T> = {
  key: keyof T;
  label: string;
  format?: (value: any) => string;
};

interface ExportViewProps<T> {
  data: T[];
  headers: Header<T>[];
  filename: string;
}

const ExportView = <T extends Record<string, any>>({ data, headers, filename }: ExportViewProps<T>) => {

  const escapeCsvCell = (cellData: any) => {
    let cell = cellData === null || cellData === undefined ? '' : String(cellData);
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      cell = `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  };

  const handleExportCSV = () => {
    const headerRow = headers.map(h => h.label).join(',');
    const bodyRows = data.map(row => 
      headers.map(h => {
        const value = row[h.key];
        const formattedValue = h.format ? h.format(value) : value;
        return escapeCsvCell(formattedValue);
      }).join(',')
    ).join('\n');

    const csvContent = `${headerRow}\n${bodyRows}`;
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const escapeXml = (unsafe: string) => {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
  }

  const handleExportXML = () => {
    let xmlString = '<?xml version="1.0" encoding="UTF-8"?>\n<records>\n';
    
    data.forEach(row => {
        xmlString += '  <record>\n';
        headers.forEach(h => {
            const key = String(h.key);
            const value = row[h.key];
            const formattedValue = h.format ? h.format(value) : (value ?? '');
            xmlString += `    <${key}>${escapeXml(String(formattedValue))}</${key}>\n`;
        });
        xmlString += '  </record>\n';
    });

    xmlString += '</records>';

    const blob = new Blob([xmlString], { type: 'application/xml;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.xml`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const headerHtml = headers.map(h => `<th style="padding: 8px; border: 1px solid #ddd; text-align: left;">${h.label}</th>`).join('');
    const bodyHtml = data.map(row => `
        <tr>
            ${headers.map(h => {
                const value = row[h.key];
                const formattedValue = h.format ? h.format(value) : (value ?? '');
                return `<td style="padding: 8px; border: 1px solid #ddd;">${formattedValue}</td>`;
            }).join('')}
        </tr>
    `).join('');

    const printWindow = window.open('', '', 'height=600,width=800');
    if(printWindow) {
        printWindow.document.write('<html><head><title>Imprimir Dados</title>');
        printWindow.document.write('<style>body{font-family: sans-serif;} table{width: 100%; border-collapse: collapse;} </style>');
        printWindow.document.write('</head><body>');
        printWindow.document.write(`<h1>Relatório - ${filename.replace(/_/g, ' ')}</h1>`);
        printWindow.document.write('<table>');
        printWindow.document.write(`<thead><tr>${headerHtml}</tr></thead>`);
        printWindow.document.write(`<tbody>${bodyHtml}</tbody>`);
        printWindow.document.write('</table>');
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }
  };

  return (
    <div className="p-8 bg-slate-50 rounded-2xl shadow-sm">
      <h3 className="text-lg font-semibold text-slate-800 mb-6">Opções de Exportação</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button onClick={handleExportCSV} className="bg-accent-success hover:bg-green-700">
          Exportar para Excel (CSV)
        </Button>
        <Button onClick={handlePrint} className="bg-accent-error hover:bg-red-700">
          Exportar para PDF (Imprimir)
        </Button>
        <Button onClick={handleExportXML} className="bg-accent-info hover:bg-blue-700">
          Exportar para XML
        </Button>
      </div>
      <p className="text-sm text-slate-500 mt-4">
          Para exportar para PDF, utilize a função "Salvar como PDF" da caixa de diálogo de impressão do seu navegador.
      </p>
    </div>
  );
};

export default ExportView;