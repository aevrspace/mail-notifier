// ./src/routes/s3.routes.ts

import { Router } from "express";
import multer from "multer";
import { S3UploadService } from "../services/s3.service.js";

const router = Router();
const s3Service = new S3UploadService();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
});

// Upload single file
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No file provided" });
    }

    const file = {
      buffer: req.file.buffer,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    };

    const result = await s3Service.uploadFile(
      file,
      req.body.folder || "uploads"
    );

    if (result.success) {
      res.json({
        success: true,
        file: {
          key: result.key,
          url: result.url,
          name: file.originalName,
          size: file.size,
        },
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// Upload multiple files
router.post("/upload-multiple", upload.array("files", 10), async (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      throw new Error("No files provided");
    }

    const files = req.files.map((file) => ({
      buffer: file.buffer,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    }));

    const results = await s3Service.uploadFiles(
      files,
      req.body.folder || "uploads"
    );

    const successfulUploads = results.filter((r) => r.success);
    const failedUploads = results.filter((r) => !r.success);

    res.json({
      success: failedUploads.length === 0,
      uploaded: successfulUploads.length,
      failed: failedUploads.length,
      files: results.map((result, index) => ({
        name: files[index].originalName,
        success: result.success,
        key: result.key,
        url: result.url,
        error: result.error,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

export default router;
