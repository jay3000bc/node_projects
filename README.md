# Multi Agent, Multi Client chat

Helix Chat (Open Source)
Free to modify, contribute.

Summary:

I wrote this support chat service in approx. 4 days. It uses Node.js socket.io. Beautification of the User interface is also done to some extent. Perhaps some more beautification is required. Client side coding is mainly done using Handlebars, but you can always use any template engine of your choice. It also used Bootstrap and jQuery.

The chat server does not use any Database, hence no hassle of installation.  It uses a credentials file (json), where you can store all your agents usernames/ passwords.

A ring.mp3 is used to produce audio (ringing) in the Agents interface, if any customer/ client is waiting in queue. One agent can take up multiple customers/ clients or multiple Agents (if available) can take up any number of clients.

Further improvement:
I will make use of Redis server for storage of all conversations. This is helpful to email the chat transcript. Alternately Mongo DB can also be used.

For more improvement, you can use Google’s Browser Racer channel instead of socket.io. Meteor or Derby can also be added, if anybody wishes to modify/ contribute.

Features:

1. No database.
2. Multiple clients/ customers can connect to the chat server
3. Agents will have to login first
4. Controlpanel for Agents
6. Control panel displays all active agent/ client or clients in queue
7. If client is waiting in queue, it will start ringing in the Agent interface
