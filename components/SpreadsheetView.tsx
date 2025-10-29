
import React, { useState, useEffect } from 'react';
import { Input } from './ui/Input'; // Import the Input component

type Column<T> = {
  key: keyof T;
  label: string;
  format?: (value: any) => string;
};

interface SpreadsheetViewProps<T> {
  data: T[];
  columns: Column<T>[];
}

const SpreadsheetView = <T extends Record<string, any>>({ data, columns }: SpreadsheetViewProps<T>) => {
  const [gridData, setGridData] = useState(data);

  useEffect(() => {
    setGridData(data);
  }, [data]);

  const handleCellChange = (rowIndex: number, columnKey: keyof T, value: any) => {
    const newData = [...gridData];
    newData[rowIndex] = { ...newData[rowIndex], [columnKey]: value };
    setGridData(newData);
  };

  return (
    <div className="overflow-x-auto border border-gray-200 rounded-xl">
      <table className="w-full text-sm text-left table-fixed">
        <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
          <tr>
            <th className="px-4 py-3 font-semibold w-16 text-center">#</th>
            {columns.map(col => (
              <th key={String(col.key)} scope="col" className="px-4 py-3 font-semibold min-w-[150px]">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {gridData.map((row, rowIndex) => (
            <tr key={row.id || rowIndex} className="hover:bg-slate-50">
              <td className="px-4 py-1 text-center text-slate-500">{rowIndex + 1}</td>
              {columns.map(col => (
                <td key={String(col.key)} className="px-1 py-1">
                  <Input
                    type="text"
                    value={col.format ? col.format(row[col.key]) : row[col.key] ?? ''}
                    onChange={(e) => handleCellChange(rowIndex, col.key, e.target.value)}
                    className="w-full p-2 bg-transparent focus:bg-white border-2 border-transparent focus:border-primary-500 rounded-lg outline-none transition"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SpreadsheetView;