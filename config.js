/* ============================================================
   Daily Deal App — কনফিগ (শুধু এই ফাইলটাই আপনাকে এডিট করতে হবে)
   ------------------------------------------------------------
   USER_URL / ADMIN_URL ফাঁকা ("") রাখলে অ্যাপ এই রেপোর ভেতরের
   site/index.html ও site/admin.html ফাইল চালাবে।

   আপনার "অরিজিনাল" গিটহাব পেজের লিংক বসালে অ্যাপ সবসময় সেই
   লাইভ সাইট থেকে লোড হবে — অরিজিনালে আপডেট দিলেই অ্যাপে অটো আপডেট।
   উদাহরণ:
     USER_URL : "https://dailydeal.world/"
     ADMIN_URL: "https://movilover.github.io/dailydeal.admin/"
   (শুধু https এবং *.github.io বা ALLOWED_HOSTS-এ দেওয়া ডোমেইন চলবে)
   ============================================================ */
window.APP_CONFIG = {
  USER_URL: "https://dailydeal.world/",
  ADMIN_URL: "https://movilover.github.io/dailydeal.admin/",
  ALLOWED_HOSTS: []   // কাস্টম ডোমেইন থাকলে: ["shop.example.com"]
};
