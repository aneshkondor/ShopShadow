Task 4.6 User Testing applicaitons

/Users/aneshkondor/Coding/cursor_projects/ShopShadow/flask-detection/logs/shopshadow-2025-11-03-15-19-58.log

UI Fixes Needed:
* Disconnect button issue:
    * Currently freezes the website when clicked while logged in and connected to a basket.
    * Needs to be fixed to allow disconnection from the basket while remaining logged in.
* Login without basket connection:
    * Users should not be required to be connected to a basket to log in.
* Reconnection after disconnection:
    * Devices cannot be reconnected until the Python Flask detection script is restarted.
    * This needs to be resolved.

Admin Dashboard Issues:
* User page implementation:
* Not showing users who have been signed up after logging in.
* Demo account should be visible with Sample data:
    * Keep sample data like past orders specific to the demo account for consistent display.
* Admin dashboard should not have sample data.
* Another account, demoadmin@email.com, should have sample data.
Password Reset:
* Need a method to reset passwords.

Admin Page Functionality:
* Edit item and remove items from the mapped list:
* Not working currently.
* Should allow editing of stock quantity and cost.
* Add product button:
* Can remain non-functional for now.
* A new major feature and brainstorming are required for future implementation.
