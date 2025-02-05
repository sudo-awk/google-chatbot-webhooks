function webhook_DailyNuggets() {
  const webhookUrl = "YOUR-GOOGLE-CHAT-WEBHOOKURL"; 
  const spreadsheetId = "SPREADSHEET_ID_URI";
  const sheetName = "SHEETNAME";
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName(sheetName);

  if (!sheet) {
    Logger.log(`❌ Sheet '${sheetName}' not found.`);
    return;
  }

  let lastRow = sheet.getLastRow();
  let currentRow = parseInt(PropertiesService.getScriptProperties().getProperty("currentRow") || "1", 10);

  // ✅ If the next row is empty or we exceeded lastRow, restart from row 1
  if (currentRow > lastRow || isRowEmpty(sheet, currentRow)) {
    Logger.log("✅ Reached an empty row or end of sheet. Restarting from row 1.");
    currentRow = 1;
  }

  // ✅ Fetch data from the current row
  const title = sheet.getRange(currentRow, 1).getValue() || "📢 Daily Nuggets"; // A - Title
  const description = sheet.getRange(currentRow, 2).getValue() || ""; // B - Description
  const steps = sheet.getRange(currentRow, 3).getValue() || ""; // C - Steps
  const imageUrl = sheet.getRange(currentRow, 4).getValue() || ""; // D - Google Drive Image URL
  const resources = sheet.getRange(currentRow, 5).getValue() || ""; // E - Resources

  // ✅ Convert Google Drive Image Link to a Direct Public URL
  const publicImageUrl = getGoogleDriveDirectImageUrl(imageUrl);

  // ✅ Create Google Chat Message
  const message = {
    "cardsV2": [{
      "cardId": "daily_nuggets_card",
      "card": {
        "header": {
          "title": title,
          "subtitle": description,
          "imageUrl": publicImageUrl,
          "imageType": "CIRCLE"
        },
        "sections": [{
          "widgets": [
            {
              "textParagraph": {
                "text": `<b>Steps:</b><br>${steps}`
              }
            },
            {
              "image": {
                "imageUrl": publicImageUrl
              }
            },
            {
              "textParagraph": {
                "text": `<b>Resources:</b><br><a href="${resources}">Click here</a>`
              }
            }
          ]
        }]
      }
    }]
  };

  // ✅ Send Data to Google Chat
  UrlFetchApp.fetch(webhookUrl, {
    "method": "post",
    "contentType": "application/json",
    "payload": JSON.stringify(message)
  });

  Logger.log(`✅ Sent to Google Chat: Row ${currentRow}`);

  // 🔄 Move to the next row
  currentRow++;
  PropertiesService.getScriptProperties().setProperty("currentRow", currentRow);
}

// ✅ Checks if a row is empty
function isRowEmpty(sheet, row) {
  const rowValues = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  return rowValues.every(cell => cell === "");
}

// ✅ Convert Google Drive Link to Direct Image URL
function getGoogleDriveDirectImageUrl(driveUrl) {
  if (!driveUrl || typeof driveUrl !== "string" || driveUrl.trim() === "") {
    Logger.log("❌ Invalid or empty Google Drive link.");
    return "";
  }

  let fileIdMatch = driveUrl.match(/(?:drive\.google\.com\/file\/d\/|drive\.google\.com\/open\?id=|\/d\/|id=)([a-zA-Z0-9_-]+)/);
  if (!fileIdMatch) {
    Logger.log("❌ Invalid Google Drive link format: " + driveUrl);
    return "";
  }

  let fileId = fileIdMatch[1];
  Logger.log("✅ Extracted File ID: " + fileId);

  try {
    let file = DriveApp.getFileById(fileId);

    // 🔹 Get Viewable Image Link
    let publicUrl = `https://lh3.googleusercontent.com/d/${fileId}`;
    
    Logger.log("✅ Public Image URL: " + publicUrl);
    return publicUrl;
  } catch (e) {
    Logger.log(`❌ Error getting file: ${e.message}`);
    return "";
  }
}
