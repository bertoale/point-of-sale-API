// Middleware untuk menangani route yang tidak ditemukan (404)
const notFound = (req, res, next) => {
  const error = new Error(`NOT FOUND - ${req.originalUrl}`);
  res.status(404); // Set status code menjadi 404
  next(error); // Meneruskan error ke middleware berikutnya
};

// Middleware untuk menangani semua error
const errorHandler = (err, req, res, next) => {
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode; // Cek apakah status code sudah di-set
  let message = err.message;
  if (err.name == "ValidationError") {
    message = Object.values(err.errors).map((item) => item.message);
  }
  // Periksa apakah error merupakan CastError (misalnya kesalahan format ObjectId)
  if (err.name === "CastError" && err.kind === "_id") {
    message = "Resource Not Found";
    statusCode = 404;
  }
  // Kirim respons JSON dengan status code dan pesan error
  res.status(statusCode).json({
    message,
    // Jangan tampilkan stack trace jika di environment production
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

export { notFound, errorHandler };
