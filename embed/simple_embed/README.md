
1. The user needs to have an embed iframe from an existing scene. This can only 
be achieved by using the "Share or Embed" option from www.lagoa.com. Copy the 
displayed link. Then, the user needs to set the iframe element in test_embed_sc.html 
with the copied link. Suffice to say, this is critical.


2. The user needs to be aware of his existing userID. He needs to assign this value to 
the 'user_id' variable in the test_embed_sc.js file. This is the only way to view their 
associated projects and uploaded assets. Currently, there is a facility that may circumvent 
this: the code actually queries the current user signed on to lagoa.com and fetches their userID.