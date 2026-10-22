// KONFIGURASI ID
const SHEET_LOGIN_ID = '1Q8BJBbL-Rk0QEq5HeroP4AMM4G3pmI1qW3i9RC7qrvs';
const SHEET_DATA_ID = '1CcD1CAkXkus0iHLg4Q07RutGx85nsaB6-hBGPU-qGKI';
const DRIVE_FOLDER_ID = '1liegX11st8HsJ5KNAC_gVfHxslThH9N0';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    let result = null;

    if (action === 'login') {
      result = doLogin(data.username, data.password);
    } else if (action === 'getUsers') {
      result = getUsers();
    } else if (action === 'saveUser') {
      result = saveUser(data);
    } else if (action === 'deleteUser') {
      result = deleteUser(data.username);
    } else if (action === 'getInventory') {
      result = getInventory();
    } else if (action === 'saveCard') {
      result = saveCard(data);
    } else if (action === 'deleteCard') {
      result = deleteCard(data.id);
    } else if (action === 'updateCardStatus') {
      result = updateCardStatus(data);
    } else if (action === 'batchUpdateCardStatus') {
      result = batchUpdateCardStatus(data);
    } else if (action === 'getAuctions') {
      result = getAuctions();
    } else if (action === 'saveAuction') {
      result = saveAuction(data);
    } else if (action === 'finishAuction') {
      result = finishAuction(data);
    } else if (action === 'getStats') {
      result = getStats();
    } else {
      throw new Error("Action not found");
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// GET handler untuk CORS / Browser check
function doGet(e) {
  try {
    const action = (e && e.parameter) ? e.parameter.action : null;
    let result = null;
    if (!action) {
      result = { message: "Google Apps Script Backend API Running" };
    } else if (action === 'getInventory') {
      result = getInventory();
    } else if (action === 'getAuctions') {
      result = getAuctions();
    } else if (action === 'getStats') {
      result = getStats();
    } else {
      result = { message: "Action " + action + " ready" };
    }
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// OPTIONS handle untuk CORS
function doOptions(e) {
  return ContentService.createTextOutput("")
    .setMimeType(ContentService.MimeType.TEXT);
}

// --------------------------------------------------------------------------
// HELPER FUNCTIONS
// --------------------------------------------------------------------------

function uploadImageToDrive(fileData) {
  if (!fileData) return '';
  const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
  const blob = Utilities.newBlob(Utilities.base64Decode(fileData.data), fileData.mimeType, fileData.name);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return file.getUrl();
}

function getSheetData(sheetName) {
  const ss = SpreadsheetApp.openById(SHEET_DATA_ID);
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) return [];

  const data = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = data[0];
  const rows = [];

  for (let i = 1; i < data.length; i++) {
    // Skip empty rows where ID or first cell is empty
    if (!data[i][0] && !data[i][1]) continue;
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    rows.push(obj);
  }
  return rows;
}

// --------------------------------------------------------------------------
// BUSINESS LOGIC
// --------------------------------------------------------------------------

function doLogin(username, password) {
  const ss = SpreadsheetApp.openById(SHEET_LOGIN_ID);
  let sheet = ss.getSheetByName("Users");
  
  // Jika sheet belum ada, otomatis buat dan isi dengan default admin
  if (!sheet) {
    sheet = ss.insertSheet("Users");
    sheet.appendRow(["Username", "Password", "Name", "Role"]);
    sheet.appendRow(["admin", "admin123", "Pacar Alya", "Pacar Alya"]);
  }
  
  const data = sheet.getDataRange().getValues();
  // Asumsi Kolom: Username (A), Password (B), Name (C), Role (D)
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == username && data[i][1] == password) {
      return { id: i, username: data[i][0], name: data[i][2], role: data[i][3] };
    }
  }
  throw new Error("Username atau password salah");
}

function getUsers() {
  const ss = SpreadsheetApp.openById(SHEET_LOGIN_ID);
  let sheet = ss.getSheetByName("Users");
  if (!sheet) {
    sheet = ss.insertSheet("Users");
    sheet.appendRow(["Username", "Password", "Name", "Role"]);
    sheet.appendRow(["admin", "admin123", "Pacar Alya", "Pacar Alya"]);
  }
  const data = sheet.getDataRange().getValues();
  const users = [];
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    users.push({
      id: i,
      username: String(data[i][0]),
      password: String(data[i][1] || ''),
      name: String(data[i][2] || data[i][0]),
      role: String(data[i][3] || 'Admin')
    });
  }
  return users;
}

function saveUser(data) {
  if (!data || !data.username) throw new Error("Username wajib diisi");
  const ss = SpreadsheetApp.openById(SHEET_LOGIN_ID);
  let sheet = ss.getSheetByName("Users");
  if (!sheet) {
    sheet = ss.insertSheet("Users");
    sheet.appendRow(["Username", "Password", "Name", "Role"]);
    sheet.appendRow(["admin", "admin123", "Pacar Alya", "Pacar Alya"]);
  }
  const values = sheet.getDataRange().getValues();
  let foundRow = -1;
  const targetUser = String(data.username).trim().toLowerCase();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === targetUser) {
      foundRow = i + 1;
      break;
    }
  }

  if (foundRow !== -1) {
    // Update
    if (data.password) sheet.getRange(foundRow, 2).setValue(data.password);
    if (data.name) sheet.getRange(foundRow, 3).setValue(data.name);
    if (data.role) sheet.getRange(foundRow, 4).setValue(data.role);
    return { success: true, action: 'updated', username: data.username };
  } else {
    // Insert
    sheet.appendRow([data.username.trim(), data.password || '123456', data.name || data.username, data.role || 'Admin']);
    return { success: true, action: 'created', username: data.username };
  }
}

function deleteUser(username) {
  if (!username) throw new Error("Username wajib diisi");
  if (username.toLowerCase() === 'admin') throw new Error("User admin utama tidak dapat dihapus");
  const ss = SpreadsheetApp.openById(SHEET_LOGIN_ID);
  let sheet = ss.getSheetByName("Users");
  if (!sheet) return false;
  const values = sheet.getDataRange().getValues();
  const targetUser = String(username).trim().toLowerCase();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]).trim().toLowerCase() === targetUser) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  throw new Error("User tidak ditemukan");
}

function getInventory() {
  const data = getSheetData("Inventory");
  // Ensure date formats are correct
  return data.map(row => {
    if (row.date && row.date instanceof Date) row.date = row.date.toISOString().split('T')[0];
    if (row.soldDate && row.soldDate instanceof Date) row.soldDate = row.soldDate.toISOString().split('T')[0];
    if (row.shipDate && row.shipDate instanceof Date) row.shipDate = row.shipDate.toISOString().split('T')[0];
    if (row.payoutDate && row.payoutDate instanceof Date) row.payoutDate = row.payoutDate.toISOString().split('T')[0];
    return row;
  }).reverse(); // Latest first
}

function saveCard(data) {
  data = data || {};
  const ss = SpreadsheetApp.openById(SHEET_DATA_ID);
  let sheet = ss.getSheetByName("Inventory");
  if (!sheet) {
    sheet = ss.insertSheet("Inventory");
    sheet.appendRow(["id", "name", "nation", "owner", "date", "type", "status", "buyer", "price", "soldDate", "shipDate", "trackingNumber", "komisi", "payoutDate", "payoutProofUrl", "set", "grade", "image"]);
  }
  
  const cardType = (data.type || data.language || 'JP').toString().toUpperCase() === 'EN' ? 'EN' : 'JP';
  const rows = sheet.getDataRange().getValues();
  let headers = rows[0] || [];
  
  // Pastikan kolom set, grade, image ada di spreadsheet jika belum ada
  const extraCols = ["set", "grade", "image"];
  extraCols.forEach(col => {
    if (headers.indexOf(col) === -1) {
      sheet.getRange(1, headers.length + 1).setValue(col);
      headers.push(col);
    }
  });
  
  if (data.id) {
    // Update existing
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] == data.id) {
        // Update basic info
        sheet.getRange(i + 1, 2).setValue(data.name || '');
        sheet.getRange(i + 1, 3).setValue(data.nation || '');
        sheet.getRange(i + 1, 4).setValue(data.owner || '');
        sheet.getRange(i + 1, 5).setValue(data.date || '');
        sheet.getRange(i + 1, 6).setValue(cardType);
        if (headers.indexOf('set') !== -1) sheet.getRange(i + 1, headers.indexOf('set') + 1).setValue(data.set || '');
        if (headers.indexOf('grade') !== -1) sheet.getRange(i + 1, headers.indexOf('grade') + 1).setValue(data.grade !== undefined ? data.grade : '');
        if (headers.indexOf('image') !== -1) sheet.getRange(i + 1, headers.indexOf('image') + 1).setValue(data.image || '');
        return { ...data, type: cardType };
      }
    }
  } else {
    // Insert new
    const id = 'C' + new Date().getTime().toString().slice(-5);
    const newRow = new Array(headers.length).fill('');
    newRow[0] = id;
    newRow[1] = data.name || '';
    newRow[2] = data.nation || '';
    newRow[3] = data.owner || '';
    newRow[4] = data.date || '';
    newRow[5] = cardType;
    newRow[6] = 'Available';
    if (headers.indexOf('set') !== -1) newRow[headers.indexOf('set')] = data.set || '';
    if (headers.indexOf('grade') !== -1) newRow[headers.indexOf('grade')] = data.grade !== undefined ? data.grade : '';
    if (headers.indexOf('image') !== -1) newRow[headers.indexOf('image')] = data.image || '';
    sheet.appendRow(newRow);
    return { ...data, id: id, status: 'Available', type: cardType };
  }
}

function deleteCard(id) {
  if (!id) return false;
  const ss = SpreadsheetApp.openById(SHEET_DATA_ID);
  const sheet = ss.getSheetByName("Inventory");
  if (!sheet) return true;
  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] == id) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

function updateCardStatus(data) {
  data = data || {};
  if (!data.id) return false;
  const ss = SpreadsheetApp.openById(SHEET_DATA_ID);
  let sheet = ss.getSheetByName("Inventory");
  if (!sheet) {
    sheet = ss.insertSheet("Inventory");
    sheet.appendRow(["id", "name", "nation", "owner", "date", "type", "status", "buyer", "price", "soldDate", "shipDate", "trackingNumber", "komisi", "payoutDate", "payoutProofUrl"]);
  }
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.id) {
      // Update status (col 7)
      sheet.getRange(i + 1, 7).setValue(data.status || '');
      
      const extra = data.extra || {};
      
      if (extra.buyer !== undefined) sheet.getRange(i + 1, headers.indexOf('buyer') + 1).setValue(extra.buyer);
      if (extra.price !== undefined) sheet.getRange(i + 1, headers.indexOf('price') + 1).setValue(extra.price);
      if (extra.soldDate !== undefined) sheet.getRange(i + 1, headers.indexOf('soldDate') + 1).setValue(extra.soldDate);
      if (extra.shipDate !== undefined) sheet.getRange(i + 1, headers.indexOf('shipDate') + 1).setValue(extra.shipDate);
      if (extra.trackingNumber !== undefined) sheet.getRange(i + 1, headers.indexOf('trackingNumber') + 1).setValue(extra.trackingNumber);
      if (extra.payoutDate !== undefined) sheet.getRange(i + 1, headers.indexOf('payoutDate') + 1).setValue(extra.payoutDate);
      if (extra.payoutProofUrl !== undefined) sheet.getRange(i + 1, headers.indexOf('payoutProofUrl') + 1).setValue(extra.payoutProofUrl);
      if (extra.commission !== undefined) {
        const commIdx = headers.indexOf('komisi');
        if (commIdx !== -1) sheet.getRange(i + 1, commIdx + 1).setValue(extra.commission);
      }
      
      return true;
    }
  }
  throw new Error("Card not found");
}

/**
 * batchUpdateCardStatus – update banyak kartu sekaligus dengan 1 resi yang sama
 * payload: { ids: string[], status: string, extra: object }
 */
function batchUpdateCardStatus(data) {
  data = data || {};
  const ids = data.ids || [];
  if (!ids.length) return { updated: 0 };

  const ss = SpreadsheetApp.openById(SHEET_DATA_ID);
  let sheet = ss.getSheetByName('Inventory');
  if (!sheet) throw new Error('Inventory sheet not found');

  const rows    = sheet.getDataRange().getValues();
  const headers = rows[0];
  let updatedCount = 0;

  for (const id of ids) {
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] == id) {
        // Update status (kolom 7)
        sheet.getRange(i + 1, 7).setValue(data.status || '');

        const extra = data.extra || {};
        if (extra.shipDate       !== undefined) sheet.getRange(i + 1, headers.indexOf('shipDate')       + 1).setValue(extra.shipDate);
        if (extra.trackingNumber !== undefined) sheet.getRange(i + 1, headers.indexOf('trackingNumber') + 1).setValue(extra.trackingNumber);
        if (extra.payoutDate     !== undefined) sheet.getRange(i + 1, headers.indexOf('payoutDate')     + 1).setValue(extra.payoutDate);
        if (extra.payoutProofUrl !== undefined) sheet.getRange(i + 1, headers.indexOf('payoutProofUrl') + 1).setValue(extra.payoutProofUrl);
        if (extra.commission     !== undefined) {
          const commIdx = headers.indexOf('komisi');
          if (commIdx !== -1) sheet.getRange(i + 1, commIdx + 1).setValue(extra.commission);
        }

        updatedCount++;
        break;
      }
    }
  }
  return { updated: updatedCount };
}

function getAuctions() {
  const aucData = getSheetData("Auctions");
  const itemData = getSheetData("AuctionItems");
  
  return aucData.map(a => {
    if (a.date && a.date instanceof Date) a.date = a.date.toISOString().split('T')[0];
    const items = itemData.filter(i => i.auctionId == a.id);
    a.cardIds = items.map(i => i.cardId);
    a.results = items.filter(i => i.sold).map(i => ({ cardId: i.cardId, sold: true, buyer: i.buyer, price: i.price }));
    return a;
  }).reverse();
}

function saveAuction(data) {
  data = data || {};
  const ss = SpreadsheetApp.openById(SHEET_DATA_ID);
  
  // Save Auction Header
  let sheetAuc = ss.getSheetByName("Auctions");
  if (!sheetAuc) {
    sheetAuc = ss.insertSheet("Auctions");
    sheetAuc.appendRow(["id", "fbUrl", "status", "date"]);
  }
  const id = 'A' + new Date().getTime();
  const dateStr = new Date().toISOString().split('T')[0];
  sheetAuc.appendRow([id, data.fbUrl || '', 'Active', dateStr]);
  
  // Save Auction Items
  let sheetItems = ss.getSheetByName("AuctionItems");
  if (!sheetItems) {
    sheetItems = ss.insertSheet("AuctionItems");
    sheetItems.appendRow(["auctionId", "cardId", "sold", "buyer", "price"]);
  }
  
  const cardIds = data.cardIds || [];
  cardIds.forEach(cardId => {
    sheetItems.appendRow([id, cardId, false, '', '']);
    // Update card status to Auction
    updateCardStatus({id: cardId, status: 'Auction', extra: {}});
  });
  
  return { id: id, fbUrl: data.fbUrl || '', status: 'Active', date: dateStr, cardIds: cardIds };
}

function finishAuction(data) {
  data = data || {};
  const ss = SpreadsheetApp.openById(SHEET_DATA_ID);
  
  // Update Auction Status
  let sheetAuc = ss.getSheetByName("Auctions");
  if (!sheetAuc) {
    sheetAuc = ss.insertSheet("Auctions");
    sheetAuc.appendRow(["id", "fbUrl", "status", "date"]);
  }
  const aucRows = sheetAuc.getDataRange().getValues();
  for (let i = 1; i < aucRows.length; i++) {
    if (aucRows[i][0] == data.auctionId) {
      sheetAuc.getRange(i + 1, 3).setValue('Finished');
      break;
    }
  }
  
  // Update Items & Cards
  let sheetItems = ss.getSheetByName("AuctionItems");
  if (!sheetItems) {
    sheetItems = ss.insertSheet("AuctionItems");
    sheetItems.appendRow(["auctionId", "cardId", "sold", "buyer", "price"]);
  }
  const itemRows = sheetItems.getDataRange().getValues();
  const results = data.results || [];
  
  for (let r of results) {
    // Update AuctionItems
    for (let j = 1; j < itemRows.length; j++) {
      if (itemRows[j][0] == data.auctionId && itemRows[j][1] == r.cardId) {
        if (r.sold) {
          sheetItems.getRange(j + 1, 3).setValue(true);
          sheetItems.getRange(j + 1, 4).setValue(r.buyer);
          sheetItems.getRange(j + 1, 5).setValue(r.price);
        }
        break;
      }
    }
    
    // Update Inventory Card Status
    if (r.sold) {
      updateCardStatus({
        id: r.cardId, 
        status: 'Waiting Shipment', 
        extra: { buyer: r.buyer, price: r.price, soldDate: new Date().toISOString().split('T')[0] }
      });
    } else {
      updateCardStatus({ id: r.cardId, status: 'Available', extra: {} });
    }
  }
  return true;
}

function getStats() {
  const cards = getSheetData("Inventory");
  const auctions = getSheetData("Auctions");
  
  return {
    total: cards.length,
    available: cards.filter(c => c.status === 'Available').length,
    sold: cards.filter(c => c.status === 'Sold').length,
    auctionActive: auctions.filter(a => a.status === 'Active').length,
    auctionDone: auctions.filter(a => a.status === 'Finished').length,
    shipment: cards.filter(c => c.status === 'Waiting Shipment').length,
    shipped: cards.filter(c => c.status === 'Shipped').length,
    payment: cards.filter(c => c.status === 'Waiting Payment').length,
    completed: cards.filter(c => c.status === 'Completed').length
  };
}

