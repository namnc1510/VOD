const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const headers = [
  'Tên phim',
  'Đường dẫn tĩnh (Slug)',
  'Tóm tắt',
  'Đạo diễn',
  'Năm phát hành',
  'Chất lượng',
  'Định dạng',
  'Trạng thái',
  'Thể loại (Cách nhau bằng phẩy)',
  'Quốc gia (Cách nhau bằng phẩy)',
  'Từ khóa (Tags)',
  'Diễn viên (Cách nhau bằng phẩy)',
  'Link Poster',
  'Link Backdrop',
  'Link Trailer',
  'Link Xem Phim'
];

const sampleData = [
  {
    'Tên phim': 'Avengers: Endgame',
    'Đường dẫn tĩnh (Slug)': 'avengers-endgame',
    'Tóm tắt': 'Phim siêu anh hùng chiếu rạp hay nhất thập kỷ.',
    'Đạo diễn': 'Anthony Russo, Joe Russo',
    'Năm phát hành': 2019,
    'Chất lượng': 'HD',
    'Định dạng': 'movie',
    'Trạng thái': 'released',
    'Thể loại (Cách nhau bằng phẩy)': 'Hành Động, Viễn Tưởng',
    'Quốc gia (Cách nhau bằng phẩy)': 'Mỹ',
    'Từ khóa (Tags)': 'marvel, avengers, iron man',
    'Diễn viên (Cách nhau bằng phẩy)': 'Robert Downey Jr., Chris Evans',
    'Link Poster': 'https://image.tmdb.org/t/p/original/or06vS3STuS5jB0bpZpXvAGmBCC.jpg',
    'Link Backdrop': 'https://image.tmdb.org/t/p/original/7RyHsO4yDXtBv1zUU3mTpHeQ0d5.jpg',
    'Link Trailer': 'https://www.youtube.com/watch?v=TcMBFSGVi1c',
    'Link Xem Phim': 'https://www.youtube.com/watch?v=TcMBFSGVi1c'
  }
];

const ws = xlsx.utils.json_to_sheet(sampleData, { header: headers });
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Movie_Template");

const outputPath = path.join(__dirname, '..', '..', '..', '..', 'movie_import_template.xlsx');
// Wait, path.join from backend folder to the root of the user's workspace? 
// The user workspace is d:\DO-AN.
const absoluteOutputPath = 'd:\\DO-AN\\Mau_Nhap_Phim_Nhanh.xlsx';

xlsx.writeFile(wb, absoluteOutputPath);
console.log('Template created at:', absoluteOutputPath);
