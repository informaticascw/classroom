# Classroom automation
This is code a website for teachers to copy materials from one google classroom to another. 

# How to use this website (for teachers @stanislascollege.net)
Go to the website\
https://stanislas.informatica.nu/classroom

To use the website, you must have a google-account on stanislascollege.net

Features:
- copy material from one classroom to another in bulk
- select material per topic or individually
- automatically sort of material (this is the best I can do, as google doesn't disclose any ordering information through it API)
- all attachments in material are copied (not linked), the classname is added to each copied filename
- all material copied has status `concept`, it will be visible to students after you `poste` the material

# How to make this website for teachers @another.school
Technical knownledge is required to make this available for another school.

You need to:
- Fork or copy this repository,
- Enable GitHub Pages or use any other static-hosting service to host this page
- Change API and Oauth keys in index.html (the current ones are limited by google for use at stanislascollege.net)

# More technical documentation
- Official quickstart programming classroom API in javascript from Google<br>
https://developers.google.com/classroom/quickstart/js#authorize_credentials_for_a_web_application
- Manipulating elements in the DOM<br>
https://developer.mozilla.org/en-US/docs/Web/API/Element
- Object Oriented Programming in Javascript<br>
https://www.geeksforgeeks.org/introduction-object-oriented-programming-javascript/
- Datastructures in Javascript
    - Key-value-pair in Javascript<br>
https://www.freecodecamp.org/news/javascript-object-keys-tutorial-how-to-use-a-js-key-value-pair/
    - Array of objects (with key-value-pairs) in Javascript<br>
https://www.freecodecamp.org/news/javascript-array-of-objects-tutorial-how-to-create-update-and-loop-through-objects-using-js-array-methods/
    - Combining JSON Objects in JavaScript<br>
https://blog.devgenius.io/combining-json-objects-in-javascript-node-js-abe84f492d0
- or ask GitHub Copilot

