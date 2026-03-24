const xlsx = require('xlsx');

const movieImportService = require('../services/movie-import.service');
const { errorResponse, successResponse } = require('../utils/api-response');

async function importMovies(req, res, next) {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json(errorResponse('No file uploaded'));
    }

    // Support .xlsx/.xls and .csv
    const workbook = xlsx.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
      return res.status(400).json(errorResponse('Invalid spreadsheet'));
    }

    const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });
    const result = await movieImportService.importRows(rows);

    return res.status(200).json(successResponse(result));
  } catch (error) {
    return next(error);
  }
}

function downloadTemplate(req, res, next) {
  try {
    const headers = [
      'Tên Phim (title)', 'Đường Dẫn (slug)', 'Tóm Tắt (overview)',
      'Năm Phát Hành (releaseYear)', 'Chất Lượng (quality)', 'Định Dạng (type)',
      'Trạng Thái (status)',
      'Đạo Diễn (directors)', 'Diễn Viên (actors)', 'Thể Loại (genres)', 'Quốc Gia (countries)',
      'Tổng Số Tập (totalEpisodes)', 'Danh Sách Tập (episodes)',
      'Link Poster (posterUrl)', 'Link Backdrop (backdropUrl)', 'Link Trailer (trailerUrl)',
      'Link Xem Phim (streamUrl)', 'Từ Khóa (tags)'
    ];

    const data = [
      headers,
      [
        'Phim Mẫu 1', 'phim-mau-1', 'Đây là mô tả phim',
        2024, 'HD', 'series',
        'released',
        'Đạo diễn A, Đạo diễn B', 'Diễn viên X, Diễn viên Y', 'Hành động, Hài hước', 'Việt Nam, Mỹ',
        2, 'Tập 1 | https://link1.m3u8 \nTập 2 | https://link2.m3u8',
        'https://poster.jpg', 'https://backdrop.jpg', 'https://trailer.mp4',
        '', 'phim hanh dong, phim 2024'
      ]
    ];

    const ws = xlsx.utils.aoa_to_sheet(data);
    
    // Set column widths for better readability
    ws['!cols'] = headers.map(() => ({ wch: 20 }));
    ws['!cols'][12] = { wch: 40 }; // episodes column
    
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Template');
    const buffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="Movie_Import_Template.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.status(200).send(buffer);
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  importMovies,
  downloadTemplate,
};
