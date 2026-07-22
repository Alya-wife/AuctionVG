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
    } else if (action === 'getInventory') {
      result = getInventory();
    } else if (action === 'saveCard') {
      result = saveCard(data);
    } else if (action === 'deleteCard') {
      result = deleteCard(data.id);
    } else if (action === 'updateCardStatus') {
      result = updateCardStatus(data);
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
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  
  const headers = data[0];
  const rows = [];
  for (let i = 1; i < data.length; i++) {
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
  const ss = SpreadsheetApp.openById(SHEET_DATA_ID);
  let sheet = ss.getSheetByName("Inventory");
  if (!sheet) {
    sheet = ss.insertSheet("Inventory");
    sheet.appendRow(["id", "name", "nation", "owner", "date", "image", "status", "buyer", "price", "soldDate", "shipDate", "trackingNumber", "shipProofUrl", "payoutDate", "payoutProofUrl"]);
  }
  
  let imageUrl = data.image || '';
  if (data.file) {
    imageUrl = uploadImageToDrive(data.file);
  }
  
  if (data.id) {
    // Update existing
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] == data.id) {
        // Update basic info
        sheet.getRange(i + 1, 2).setValue(data.name);
        sheet.getRange(i + 1, 3).setValue(data.nation);
        sheet.getRange(i + 1, 4).setValue(data.owner);
        sheet.getRange(i + 1, 5).setValue(data.date);
        if (imageUrl) sheet.getRange(i + 1, 6).setValue(imageUrl);
        return { ...data, image: imageUrl || rows[i][5] };
      }
    }
  } else {
    // Insert new
    const id = 'C' + new Date().getTime().toString().slice(-5);
    sheet.appendRow([id, data.name, data.nation, data.owner, data.date, imageUrl, 'Available', '', '', '', '', '', '', '', '']);
    return { ...data, id: id, status: 'Available', image: imageUrl };
  }
}

function deleteCard(id) {
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
  const ss = SpreadsheetApp.openById(SHEET_DATA_ID);
  const sheet = ss.getSheetByName("Inventory");
  const rows = sheet.getDataRange().getValues();
  const headers = rows[0];
  
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] == data.id) {
      // Update status (col 7)
      sheet.getRange(i + 1, 7).setValue(data.status);
      
      const extra = data.extra || {};
      
      if (extra.buyer) sheet.getRange(i + 1, headers.indexOf('buyer') + 1).setValue(extra.buyer);
      if (extra.price) sheet.getRange(i + 1, headers.indexOf('price') + 1).setValue(extra.price);
      if (extra.soldDate) sheet.getRange(i + 1, headers.indexOf('soldDate') + 1).setValue(extra.soldDate);
      if (extra.shipDate) sheet.getRange(i + 1, headers.indexOf('shipDate') + 1).setValue(extra.shipDate);
      if (extra.trackingNumber) sheet.getRange(i + 1, headers.indexOf('trackingNumber') + 1).setValue(extra.trackingNumber);
      if (extra.payoutDate) sheet.getRange(i + 1, headers.indexOf('payoutDate') + 1).setValue(extra.payoutDate);
      if (extra.shipProofUrl) sheet.getRange(i + 1, headers.indexOf('shipProofUrl') + 1).setValue(extra.shipProofUrl);
      if (extra.payoutProofUrl) sheet.getRange(i + 1, headers.indexOf('payoutProofUrl') + 1).setValue(extra.payoutProofUrl);
      
      return true;
    }
  }
  throw new Error("Card not found");
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
  
  return { id: id, fbUrl: data.fbUrl, status: 'Active', date: dateStr, cardIds: cardIds };
}

function finishAuction(data) {
  const ss = SpreadsheetApp.openById(SHEET_DATA_ID);
  
  // Update Auction Status
  const sheetAuc = ss.getSheetByName("Auctions");
  const aucRows = sheetAuc.getDataRange().getValues();
  for (let i = 1; i < aucRows.length; i++) {
    if (aucRows[i][0] == data.auctionId) {
      sheetAuc.getRange(i + 1, 3).setValue('Finished');
      break;
    }
  }
  
  // Update Items & Cards
  const sheetItems = ss.getSheetByName("AuctionItems");
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

