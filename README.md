git init 
git add . 
git commit -m "first commit" 
# if this not remotely configured, origin should be used
git remote add origin https://github.com/charan8897/mongooperations 
# else use : git remote remove origin 
git push -u origin master
git push --set-upstream origin charan_dev    
