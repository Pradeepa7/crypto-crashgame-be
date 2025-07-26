

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI)

// If connection is successful, log message to console
 .then(() => {
  console.log("MongoDB connected!");
})

  .catch((err) => {
  console.error("MongoDB connection error:", err.message);
});