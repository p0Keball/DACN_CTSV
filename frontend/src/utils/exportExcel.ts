import * as XLSX from 'xlsx';

export const exportToExcel = <T extends Record<string, unknown>>(
  data: T[], 
  columnMapping: Record<string, string>, 
  fileName: string
) => {
  const formattedData = data.map(item => {
    const row: Record<string, unknown> = {};
    Object.keys(columnMapping).forEach(key => {
      row[columnMapping[key]] = item[key] !== null && item[key] !== undefined ? item[key] : '';
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
};