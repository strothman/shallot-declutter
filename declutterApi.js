import fs from 'fs';
import path from 'path';

export const DEFAULT_INBOX = 'G:\\My Drive\\IDE\\Declutter\\Inbox';
export const DEFAULT_OUTBOX = 'G:\\My Drive\\IDE\\Declutter\\Outbox';
export const DEFAULT_ARCHIVE = 'G:\\My Drive\\IDE\\Declutter\\Archive';

// Fallback directory if G: drive isn't connected
const FALLBACK_BASE = path.join(process.cwd(), 'local-drive');

export function getResolvedPaths() {
  let inbox = DEFAULT_INBOX;
  let outbox = DEFAULT_OUTBOX;
  let archive = DEFAULT_ARCHIVE;

  if (!fs.existsSync(inbox)) {
    try {
      fs.mkdirSync(inbox, { recursive: true });
    } catch {
      inbox = path.join(FALLBACK_BASE, 'Inbox');
      fs.mkdirSync(inbox, { recursive: true });
    }
  }

  if (!fs.existsSync(outbox)) {
    try {
      fs.mkdirSync(outbox, { recursive: true });
    } catch {
      outbox = path.join(FALLBACK_BASE, 'Outbox');
      fs.mkdirSync(outbox, { recursive: true });
    }
  }

  if (!fs.existsSync(archive)) {
    try {
      fs.mkdirSync(archive, { recursive: true });
    } catch {
      archive = path.join(FALLBACK_BASE, 'Archive');
      fs.mkdirSync(archive, { recursive: true });
    }
  }

  return { inbox, outbox, archive };
}

function sanitizePathComponent(name) {
  // Strip characters not allowed in Windows/Linux folder names: \ / : * ? " < > |
  return String(name || 'Other')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || 'Other';
}

function parseDateComponents(dateString) {
  let yyyy = new Date().getFullYear().toString();
  let mm = String(new Date().getMonth() + 1).padStart(2, '0');

  if (dateString) {
    const match = String(dateString).match(/^(\d{4})[-/.]?(\d{2})?/);
    if (match) {
      yyyy = match[1];
      if (match[2]) {
        mm = match[2];
      }
    }
  }

  return { yyyy, mm };
}

function scanAndReconcileOutbox(outbox) {
  const catalog = [];
  if (!fs.existsSync(outbox)) {
    return catalog;
  }

  function walkDir(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.json')) {
          if (entry.name.toLowerCase() === 'index.json') continue;
          try {
            const raw = fs.readFileSync(fullPath, 'utf-8');
            const metadata = JSON.parse(raw);
            const pdfPath = fullPath.replace(/\.json$/i, '.pdf');
            const pdfExists = fs.existsSync(pdfPath);
            const stat = fs.statSync(fullPath);

            const relativeJson = path.relative(outbox, fullPath);
            const relativePdf = path.relative(outbox, pdfPath);

            catalog.push({
              id: `doc_${path.basename(fullPath).replace(/\.json$/i, '')}`,
              filedAt: stat.mtime.toISOString(),
              relativePdfPath: relativePdf,
              relativeJsonPath: relativeJson,
              documentType: metadata.documentType || 'Other',
              statementDate: metadata.statementDate || '',
              personOrPatient: metadata.personOrPatient || metadata.patientOrAccount || 'N/A',
              issuer: metadata.issuer || 'Unknown',
              providerOrDoctor: metadata.providerOrDoctor || '',
              topicOrProcedure: metadata.topicOrProcedure || '',
              referenceNumber: metadata.referenceNumber || '',
              amountDue: metadata.amountDue || 'N/A',
              tags: metadata.tags || [],
              metadata,
              pdfExists,
            });
          } catch (err) {
            console.warn('Error reading json sidecar:', fullPath, err);
          }
        }
      }
    } catch (e) {
      console.warn('Error walking outbox directory:', dir, e);
    }
  }

  walkDir(outbox);

  // Sort newest statement date or filed date first
  catalog.sort((a, b) => {
    const dateA = a.statementDate || a.filedAt || '';
    const dateB = b.statementDate || b.filedAt || '';
    return dateB.localeCompare(dateA);
  });

  // Reconcile and save master Outbox/index.json
  try {
    const masterIndexPath = path.join(outbox, 'index.json');
    fs.writeFileSync(masterIndexPath, JSON.stringify(catalog, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Could not write reconciled Outbox/index.json:', err);
  }

  return catalog;
}

export async function handleApiRequest(req, res) {
  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;
  const { inbox, outbox, archive } = getResolvedPaths();

  // Helper JSON responder
  const sendJson = (status, data) => {
    res.writeHead(status, {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end(JSON.stringify(data));
  };

  // CORS Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return true;
  }

  // 1. GET /api/status - Verified counts of Inbox and Outbox
  if (pathname === '/api/status' && req.method === 'GET') {
    let inboxCount = 0;
    try {
      if (fs.existsSync(inbox)) {
        const files = fs.readdirSync(inbox, { withFileTypes: true });
        inboxCount = files.filter(f => f.isFile() && !f.name.startsWith('.')).length;
      }
    } catch {}

    const catalog = scanAndReconcileOutbox(outbox);

    sendJson(200, {
      connected: true,
      inboxPath: inbox,
      outboxPath: outbox,
      archivePath: archive,
      inboxCount,
      vaultCount: catalog.length,
    });
    return true;
  }

  // 2. GET /api/inbox - List items waiting in Inbox
  if (pathname === '/api/inbox' && req.method === 'GET') {
    try {
      if (!fs.existsSync(inbox)) {
        return sendJson(200, { files: [] });
      }

      const entries = fs.readdirSync(inbox, { withFileTypes: true });
      const validExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.pdf', '.tiff']);

      const files = entries
        .filter(entry => entry.isFile() && !entry.name.startsWith('.'))
        .filter(entry => validExtensions.has(path.extname(entry.name).toLowerCase()))
        .map(entry => {
          const fullPath = path.join(inbox, entry.name);
          const stats = fs.statSync(fullPath);
          return {
            name: entry.name,
            size: stats.size,
            mtime: stats.mtime.toISOString(),
            url: `/api/inbox/file?name=${encodeURIComponent(entry.name)}`,
            extension: path.extname(entry.name).toLowerCase(),
          };
        })
        .sort((a, b) => new Date(a.mtime).getTime() - new Date(b.mtime).getTime()); // oldest first

      sendJson(200, { inboxPath: inbox, files });
    } catch (err) {
      sendJson(500, { error: err.message });
    }
    return true;
  }

  // 3. GET /api/inbox/file?name=... - Stream an image/document
  if (pathname === '/api/inbox/file' && req.method === 'GET') {
    const filename = urlObj.searchParams.get('name');
    if (!filename) {
      sendJson(400, { error: 'Missing name parameter' });
      return true;
    }

    // Security: sanitize against directory traversal
    const safeName = path.basename(filename);
    const filePath = path.join(inbox, safeName);

    if (!fs.existsSync(filePath)) {
      sendJson(404, { error: 'File not found' });
      return true;
    }

    const ext = path.extname(safeName).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
    return true;
  }

  // 4. DELETE /api/inbox/file?name=... - Discard an inbox file
  if (pathname === '/api/inbox/file' && req.method === 'DELETE') {
    const filename = urlObj.searchParams.get('name');
    if (!filename) {
      sendJson(400, { error: 'Missing name parameter' });
      return true;
    }

    const safeName = path.basename(filename);
    const filePath = path.join(inbox, safeName);
    const trashDir = path.join(archive, 'Discarded');

    try {
      if (fs.existsSync(filePath)) {
        fs.mkdirSync(trashDir, { recursive: true });
        const destPath = path.join(trashDir, `${Date.now()}_${safeName}`);
        fs.renameSync(filePath, destPath);
      }
      sendJson(200, { success: true, discarded: safeName });
    } catch (err) {
      sendJson(500, { error: err.message });
    }
    return true;
  }

  // 5. POST /api/outbox/save - Save PDF to TYPE/YYYY/MM folder and move inbox files
  if (pathname === '/api/outbox/save' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const { fileNames, pdfBase64, docType, statementDate, filename, metadata } = payload;

        if (!pdfBase64 || !filename) {
          return sendJson(400, { error: 'Missing pdfBase64 or filename' });
        }

        // Clean folder structure: Outbox / TYPE / YYYY / MM
        const cleanType = sanitizePathComponent(docType || 'Other Document');
        const { yyyy, mm } = parseDateComponents(statementDate);

        const destFolder = path.join(outbox, cleanType, yyyy, mm);
        fs.mkdirSync(destFolder, { recursive: true });

        const safeFilename = path.basename(filename);
        const destPdfPath = path.join(destFolder, safeFilename);

        // Strip data URL prefix if present and write PDF
        const cleanBase64 = pdfBase64.replace(/^data:[a-zA-Z0-9/+-]+;base64,/, '');
        const pdfBuffer = Buffer.from(cleanBase64, 'base64');
        fs.writeFileSync(destPdfPath, pdfBuffer);

        // Save metadata sidecar JSON alongside the PDF
        let destJsonPath = null;
        if (metadata) {
          const jsonFilename = safeFilename.replace(/\.pdf$/i, '') + '.json';
          destJsonPath = path.join(destFolder, jsonFilename);
          fs.writeFileSync(destJsonPath, JSON.stringify(metadata, null, 2), 'utf-8');

          // Update master Outbox/index.json for fast search and cross-category sorting
          try {
            const masterIndexPath = path.join(outbox, 'index.json');
            let indexData = [];
            if (fs.existsSync(masterIndexPath)) {
              try {
                indexData = JSON.parse(fs.readFileSync(masterIndexPath, 'utf-8'));
                if (!Array.isArray(indexData)) indexData = [];
              } catch {
                indexData = [];
              }
            }

            const relativePdf = path.join(cleanType, yyyy, mm, safeFilename);
            const relativeJson = path.join(cleanType, yyyy, mm, jsonFilename);

            // Filter out existing record with same relative path if re-filed
            indexData = indexData.filter(item => item.relativePdfPath !== relativePdf);

            indexData.unshift({
              id: `doc_${Date.now()}`,
              filedAt: new Date().toISOString(),
              relativePdfPath: relativePdf,
              relativeJsonPath: relativeJson,
              documentType: cleanType,
              statementDate,
              personOrPatient: metadata.personOrPatient || metadata.patientOrAccount || '',
              issuer: metadata.issuer || '',
              providerOrDoctor: metadata.providerOrDoctor || '',
              topicOrProcedure: metadata.topicOrProcedure || '',
              referenceNumber: metadata.referenceNumber || '',
              amountDue: metadata.amountDue || '',
              tags: metadata.tags || [],
              metadata,
            });

            fs.writeFileSync(masterIndexPath, JSON.stringify(indexData, null, 2), 'utf-8');
          } catch (indexErr) {
            console.warn('Could not update Outbox/index.json:', indexErr);
          }
        }

        // Move processed original inbox files to Archive (outside Inbox)
        const processedDir = archive;
        fs.mkdirSync(processedDir, { recursive: true });

        const movedFiles = [];
        if (Array.isArray(fileNames)) {
          for (const name of fileNames) {
            const safeSrc = path.basename(name);
            const srcPath = path.join(inbox, safeSrc);
            if (fs.existsSync(srcPath)) {
              const targetProcessedPath = path.join(processedDir, safeSrc);
              try {
                // If collision, append timestamp
                const finalTarget = fs.existsSync(targetProcessedPath)
                  ? path.join(processedDir, `${Date.now()}_${safeSrc}`)
                  : targetProcessedPath;
                fs.renameSync(srcPath, finalTarget);
                movedFiles.push(safeSrc);
              } catch (moveErr) {
                console.warn('Could not move file to Archive:', safeSrc, moveErr);
              }
            }
          }
        }

        sendJson(200, {
          success: true,
          savedPath: destPdfPath,
          savedJsonPath: destJsonPath,
          relativeFolder: path.join(cleanType, yyyy, mm),
          filename: safeFilename,
          movedFiles,
        });
      } catch (err) {
        sendJson(500, { error: err.message });
      }
    });
    return true;
  }

  // 6. GET /api/outbox/catalog - Fetch master Outbox/index.json catalog (reconciled from physical disk files)
  if (pathname === '/api/outbox/catalog' && req.method === 'GET') {
    try {
      const catalog = scanAndReconcileOutbox(outbox);
      sendJson(200, { success: true, catalog, total: catalog.length });
    } catch (err) {
      sendJson(500, { error: err.message });
    }
    return true;
  }

  // 6b. POST /api/outbox/edit - Update document metadata sidecar JSON and reconcile
  if (pathname === '/api/outbox/edit' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const { relativeJsonPath, updatedMetadata } = payload;

        if (!relativeJsonPath || !updatedMetadata) {
          return sendJson(400, { error: 'Missing relativeJsonPath or updatedMetadata' });
        }

        const resolvedPath = path.resolve(outbox, relativeJsonPath);
        if (!resolvedPath.startsWith(path.resolve(outbox))) {
          return sendJson(403, { error: 'Access denied: outside outbox directory' });
        }

        if (!fs.existsSync(resolvedPath)) {
          return sendJson(404, { error: 'Sidecar JSON file not found on disk' });
        }

        // Write updated metadata back to physical JSON file
        fs.writeFileSync(resolvedPath, JSON.stringify(updatedMetadata, null, 2), 'utf-8');

        // Reconcile catalog
        const catalog = scanAndReconcileOutbox(outbox);

        sendJson(200, { success: true, catalog, total: catalog.length });
      } catch (err) {
        sendJson(500, { error: err.message });
      }
    });
    return true;
  }

  // 7. GET /api/outbox/check-duplicate - Check for existing file in index.json
  if (pathname === '/api/outbox/check-duplicate' && req.method === 'GET') {
    try {
      const ref = (urlObj.searchParams.get('ref') || '').trim().toLowerCase();
      const issuer = (urlObj.searchParams.get('issuer') || '').trim().toLowerCase();
      const date = (urlObj.searchParams.get('date') || '').trim();
      const amount = (urlObj.searchParams.get('amount') || '').trim();

      const masterIndexPath = path.join(outbox, 'index.json');
      let catalog = [];
      if (fs.existsSync(masterIndexPath)) {
        try {
          catalog = JSON.parse(fs.readFileSync(masterIndexPath, 'utf-8'));
          if (!Array.isArray(catalog)) catalog = [];
        } catch {}
      }

      let matchedItem = null;

      for (const item of catalog) {
        const itemRef = String(item.referenceNumber || '').trim().toLowerCase();
        const itemIssuer = String(item.issuer || '').trim().toLowerCase();
        const itemDate = String(item.statementDate || '').trim();
        const itemAmount = String(item.amountDue || '').trim();

        // Check 1: Specific reference/account number match
        if (ref && ref.length >= 4 && itemRef === ref) {
          matchedItem = item;
          break;
        }

        // Check 2: Same Issuer + Same Statement Date + Same Amount Due
        if (
          issuer &&
          date &&
          itemIssuer &&
          itemDate &&
          (itemIssuer.includes(issuer) || issuer.includes(itemIssuer)) &&
          itemDate === date &&
          (!amount || amount === '0' || amount === 'N/A' || itemAmount === amount)
        ) {
          matchedItem = item;
          break;
        }
      }

      if (matchedItem) {
        sendJson(200, { isDuplicate: true, match: matchedItem });
      } else {
        sendJson(200, { isDuplicate: false, match: null });
      }
    } catch (err) {
      sendJson(500, { error: err.message });
    }
    return true;
  }

  // 8. GET /api/outbox/file?path=... - Stream an outbox PDF or JSON
  if (pathname === '/api/outbox/file' && req.method === 'GET') {
    const relPath = urlObj.searchParams.get('path');
    if (!relPath) {
      sendJson(400, { error: 'Missing path parameter' });
      return true;
    }

    // Security: sanitize relative path and ensure it stays inside outbox
    const resolvedPath = path.resolve(outbox, relPath);
    if (!resolvedPath.startsWith(path.resolve(outbox))) {
      sendJson(403, { error: 'Access denied: outside outbox directory' });
      return true;
    }

    if (!fs.existsSync(resolvedPath)) {
      sendJson(404, { error: 'File not found' });
      return true;
    }

    const ext = path.extname(resolvedPath).toLowerCase();
    const mimeTypes = {
      '.pdf': 'application/pdf',
      '.json': 'application/json',
      '.jpg': 'image/jpeg',
      '.png': 'image/png',
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(resolvedPath).pipe(res);
    return true;
  }

  return false;
}
