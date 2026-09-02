import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "KMES API is running successfully.",
  });
});

export default router;
