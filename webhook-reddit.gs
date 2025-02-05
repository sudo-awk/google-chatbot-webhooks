//this is google chat webhook that fetches the last three posts in the netsec room of reddit
//and forwards to your google chat bot

function Reddit_sendToGoogleChat() {
  const subreddit = "netsec";
  const redditUrl = `https://oauth.reddit.com/r/${subreddit}/new.json?limit=3`; // Fetch last 3 posts

  const clientId = "REDDIT_CLIENTID";
  const clientSecret = "REDDIT_SECRET";

  const chatWebhookUrl = "YOUR_CHAT_WEBHOOK_URL";

  const scriptProperties = PropertiesService.getScriptProperties();

  try {
    // 🔹 Step 1: Get OAuth2 token
    const tokenResponse = UrlFetchApp.fetch("https://www.reddit.com/api/v1/access_token", {
      method: "post",
      headers: {
        Authorization: "Basic " + Utilities.base64Encode(`${clientId}:${clientSecret}`),
      },
      payload: {
        grant_type: "client_credentials",
      },
    });

    const tokenData = JSON.parse(tokenResponse.getContentText());
    const accessToken = tokenData.access_token;

    // 🔹 Step 2: Fetch the latest posts from the subreddit
    const response = UrlFetchApp.fetch(redditUrl, {
      method: "get",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "User-Agent": "GoogleAppsScript/1.0",
      },
    });

    const data = JSON.parse(response.getContentText());
    const posts = data.data.children.map(child => child.data);

    // 🔹 Step 3: Get last sent post ID to prevent duplicates
    const lastSentPostId = scriptProperties.getProperty("lastSentPostId");

    let newPosts = posts.filter(post => post.id !== lastSentPostId); // Only new posts

    if (newPosts.length === 0) {
      Logger.log("No new posts to send.");
      return;
    }

    let messageCards = [];

    // 🔹 Step 4: Process each post
    newPosts.forEach(post => {
      const postId = post.id;
      const postTitle = post.title;
      const postUrl = post.url;
      const postLink = `https://www.reddit.com${post.permalink}`;
      const postDate = new Date(post.created_utc * 1000).toLocaleString("en-US", {
        hour: "numeric",
        minute: "numeric",
        hour12: true,
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      let description = post.selftext; // Get Reddit post description

      // 🔹 If no description, fetch from the provided URL
      if (!description || description.trim() === "") {
        description = fetchPageMetaDescription(postUrl);
      }

      // 🔹 Build Google Chat message card
      messageCards.push({
        header: {
          title: `🛡 New Post from r/${subreddit}`,
          subtitle: `Posted by ${post.author} on ${postDate}`,
          imageUrl: "https://www.redditstatic.com/desktop2x/img/favicon/android-icon-192x192.png",
        },
        sections: [
          {
            widgets: [
              {
                textParagraph: {
                  text: `<b>${postTitle}</b><br><br>${description}<br><br>📌 <a href="${postUrl}">Read More</a> | 🔗 <a href="${postLink}">View on Reddit</a>`,
                },
              },
            ],
          },
        ],
      });

      Logger.log(`✅ Post added to message queue: ${postId}`);
    });

    // 🔹 Step 5: Send the message to Google Chat
    const messagePayload = { cards: messageCards };
    UrlFetchApp.fetch(chatWebhookUrl, {
      method: "post",
      contentType: "application/json",
      payload: JSON.stringify(messagePayload),
    });

    Logger.log(`✅ Sent ${newPosts.length} new posts to Google Chat`);

    // 🔹 Step 6: Store the latest post ID
    scriptProperties.setProperty("lastSentPostId", newPosts[0].id);
  } catch (error) {
    Logger.log(`❌ Error: ${error.message}`);
  }
}

/**
 * Fetch the meta description from the given URL
 */
function fetchPageMetaDescription(url) {
  try {
    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const html = response.getContentText();

    const metaMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i);
    return metaMatch ? metaMatch[1] : "🔍 No description available.";
  } catch (error) {
    Logger.log(`❌ Error fetching description: ${error.message}`);
    return "🔍 No description available.";
  }
}
