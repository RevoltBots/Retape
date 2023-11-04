// @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-3.0
//
// Anything related to channel rendering
//

/*
 * Load the user's DMs
 * @return {Number} Error code; should never be one
 * */
async function loadDMs() {
  try {
    const channelContainer = document.querySelector("#channelsContainer");
    const userCat = document.createElement("summary");

    state.active.channel = "";

    userCat.classList.add("categoryText");

    document.querySelector("#serverBG").src = "";

    document.querySelector("#serverName").innerText =
      storage.language.dms.description;
    document.querySelector("#channelName").innerText = "";
    channelContainer.replaceChildren();
    clearMessages();

    await fetchResource(`users/${state.connection.userProfile._id}/dm`).then(
      (response) => {
        const dmButton = document.createElement("button");

        dmButton.textContent = storage.language.dms.savedMessages;
        dmButton.classList.add("channel");
        dmButton.onclick = () => {
          getMessages(response._id);
        };

        dmButton.id = response._id;
        userCat.appendChild(dmButton);
      }
    );

    for (let i = 0; i < cache.channels.length; i++) {
      //Checking for only DMs
      if (!["DirectMessage", "Group"].includes(cache.channels[i].type))
        continue;

      const dmButton = document.createElement("button");
      dmButton.classList.add("channel");

      if (cache.channels[i].type === "Group") {
        dmButton.textContent = cache.channels[i].name;
      } else {
        let user;

        if (
          cache.channels[i].recipients[1] !== state.connection.userProfile._id
        ) {
          user = await userLookup(cache.channels[i].recipients[1]);
        } else {
          user = await userLookup(cache.channels[i].recipients[0]);
        }

        dmButton.textContent = `@${user.username}#${user.discriminator}`;
      }

      dmButton.onclick = () => {
        getMessages(cache.channels[i].id);
        document.querySelector("#channelName").innerText = dmButton.textContent;
        document.querySelector("#channelDesc").innerText.length = 0;
      };

      dmButton.id = cache.channels[i].id;
      userCat.appendChild(dmButton);
    }
    channelContainer.appendChild(userCat);
  } catch (error) {
    showError(error);
    return 1;
  }
}

function renderChannel(channelID, id) {
  const currentChannel = cacheLookup("channels", channelID);
  const channel = document.createElement("button");
  const channelText = document.createElement("span");
  const channelIcon = document.createElement("img");

  if (currentChannel.type !== "TextChannel") return false;

  channel.classList.add("channel");

  channel.onclick = () => {
    if (state.active.server !== id) {
      fetchResource(
        `servers/${id}/members/${state.connection.userProfile._id}`
      ).then((member) => {
        if (cacheLookup("members", member._id.user, id) === 1)
          cache.servers[cacheIndexLookup("servers", id)].members.push(member);
      });
    }

    state.active.server = id;
    state.active.channel = currentChannel.id;
    getMessages(currentChannel.id);
    document.querySelector("#channelName").innerText = currentChannel.name;

    //Channel description setting; the expression checks whether or not the channel has a desc
    document.querySelector("#channelDesc").innerText = currentChannel.desc
      ? currentChannel.desc
      : "This channel doesn't have a description yet";
  };

  channel.id = currentChannel.id;
  channelText.innerText = currentChannel.name;

  if (currentChannel.icon) {
    channelIcon.src = `${settings.instance.autumn}/icons/${currentChannel.icon}`;
    channel.appendChild(channelIcon);
  } else channelText.innerText = "# " + channelText.innerText;

  if (
    state.unreads.unread.channels.indexOf(currentChannel.id) !== -1 &&
    state.unreads.muted.channels.indexOf(currentChannel.id) === -1
  ) {
    if (state.unreads.mentioned.channels.indexOf(currentChannel.id) !== -1)
      channel.classList.add("mentioned-channel");
    else channel.classList.add("unread-channel");
  }

  channel.appendChild(channelText);

  //Add the muted-channel class to it if it's muted
  if (state.unreads.muted.channels.indexOf(currentChannel.id) !== -1)
    channel.classList.add("muted-channel");
  return channel;
}
/*
 * Renders channels from the cache
 * @return {Number} Error code; should never be 1
 * */
async function getChannels(id) {
  try {
    const channelContainer = document.querySelector("#channelsContainer");
    const server = cacheLookup("servers", id);
    channelContainer.replaceChildren();

    let addedChannels = [];
    if (server.categories) {
      server.categories.forEach((category) => {
        const categoryContainer = document.createElement("details");
        const categoryText = document.createElement("summary");

        categoryContainer.open = true;
        categoryContainer.classList.add("channel-category");

        categoryText.textContent = category.title;
        categoryText.classList.add("category-text");
        categoryContainer.appendChild(categoryText);

        try {
          category.channels.forEach((channel) => {
            //TODO: Ask Inderix for a VC icon
            const renderedChannel = renderChannel(channel, id);

            if (renderedChannel) categoryContainer.appendChild(renderedChannel);
            addedChannels.push(channel);
          });
          channelContainer.appendChild(categoryContainer);
        } catch (error) {
          showError(error);
        }
      });
    }

    if (server.channels.length !== addedChannels.length) {
      const defaultCategory = document.createElement("details");
      const defaultCategoryText = document.createElement("summary");

      defaultCategory.open = true;
      defaultCategory.classList.add("channel-category");
      defaultCategoryText.textContent = "Uncategorised"; //TODO: translation string
      defaultCategoryText.classList.add("categoryText");
      defaultCategory.appendChild(defaultCategoryText);

      server.channels.forEach((channel) => {
        if (addedChannels.indexOf(channel) !== -1) return;
        const renderedChannel = renderChannel(channel, id);
        if (renderedChannel) defaultCategory.appendChild(renderedChannel);
      });

      channelContainer.insertBefore(
        defaultCategory,
        channelContainer.children[0]
      );
    }
  } catch (error) {
    showError(error);
    return 1;
  }
  return 0;
}

//@license-end
