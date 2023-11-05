/* exported gapiLoaded */
/* exported gisLoaded */
/* exported handleAuthClick */
/* exported handleSignoutClick */

// TODO(developer): Set to client ID and API key from the Developer Console
const CLIENT_ID = '700908545505-6p39r6fvlj9l2mgs92f2q0s4rq9ubtv7.apps.googleusercontent.com';
const API_KEY = 'AIzaSyA7mTKuemz9MEZ5NChYKMjf4FnnrzimgYA';

// Discovery doc URL for APIs used by the quickstart
const DISCOVERY_DOC = 'https://classroom.googleapis.com/$discovery/rest';

// Authorization scopes required by the API; multiple scopes can be
// included, separated by spaces.
const SCOPES = 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly https://www.googleapis.com/auth/classroom.topics.readonly';

let tokenClient;
let gapiInited = false;
let gisInited = false;

document.getElementById('authorize_button').style.visibility = 'hidden';
document.getElementById('signout_button').style.visibility = 'hidden';

/**
 * Callback after api.js is loaded.
 */
function gapiLoaded() {
    gapi.load('client', initializeGapiClient);
}

/**
 * Callback after the API client is loaded. Loads the
 * discovery doc to initialize the API.
 */
async function initializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    maybeEnableButtons();
}

/**
 * Callback after Google Identity Services are loaded.
 */
function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
    });
    gisInited = true;
    maybeEnableButtons();
}

/**
 * Enables user interaction after all libraries are loaded.
 */
function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('authorize_button').style.visibility = 'visible';
    }
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }
        document.getElementById('signout_button').style.visibility = 'visible';
        document.getElementById('authorize_button').innerText = 'Refresh';
        await listCourses();
    };

    if (gapi.client.getToken() === null) {
        // Prompt the user to select a Google Account and ask for consent to share their data
        // when establishing a new session.
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        // Skip display of account chooser and consent dialog for an existing session.
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        document.getElementById('content').innerText = '';
        document.getElementById('authorize_button').innerText = 'Authorize';
        document.getElementById('signout_button').style.visibility = 'hidden';
    }
}


/**
 * Handles for user interaction: selection of source classroom
 */

async function handleSelectClassroom(selectObject) {
    var courseId = selectObject.value;
    console.log(`user selected courseId ${courseId}`);
    await listTopics(courseId);
    await listMaterials(courseId);
}

/**
 * Handles for user interaction: selection of topic or material
 */

/*
var checkboxes = document.querySelectorAll('input.subOption'),
  checkall = document.getElementById('option');

for (var i = 0; i < checkboxes.length; i++) {
  checkboxes[i].onclick = function () {
    var checkedCount = document.querySelectorAll('input.subOption:checked').length;

    checkall.checked = checkedCount > 0;
    checkall.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
  }
}

checkall.onclick = function () {
  for (var i = 0; i < checkboxes.length; i++) {
    checkboxes[i].checked = this.checked;
  }
}
*/


/**
 * Load courses using gapi.
 */
async function listCourses() {
    let response;
    try {
        response = await gapi.client.classroom.courses.list({
            pageSize: 10,
        });
    } catch (err) {
        document.getElementById('content').innerText += err.message;
        return;
    }

    const courses = response.result.courses;
    if (!courses || courses.length == 0) {
        document.getElementById('content').innerText += 'No courses found.';
        return;
    }
    console.log(courses)

    // Flatten to string to display
    const output = courses.reduce(
        (str, course) => `${str}${course.name}\n`,
        'Courses:\n');
    document.getElementById('content').innerText += output;

    // populate select-tag with classroom-names
    node = document.getElementById('source-classroom-list')
    template = document.getElementById('source-classroom-item-template')
    for (var i = 0; i < courses.length; i++) {
        clone = template.content.cloneNode(true);
        clone.querySelector(".option").value = courses[i].id;
        clone.querySelector(".option").textContent = `${courses[i].name}`;
        node.appendChild(clone);
    }
}

/**
 * Load topics using gapi.
 */
async function listTopics(courseId) {
    /* read topics of a course */
    let topicsResponse;
    try {
        topicsResponse = await gapi.client.classroom.courses.topics.list({
            courseId: `${courseId}`, // TODO change id into the one selected
            pageSize: 10,
        });
    } catch (err) {
        document.getElementById('content').innerText += err.message;
        return;
    }

    const topics = topicsResponse.result.topic;
    if (!topics || topics.length == 0) {
        document.getElementById('content').innerText += 'No topics found.';
        return;
    }
    console.log(topics);

    // Flatten to string to display
    const topicsOutput = topics.reduce(
        (str, topic) => `${str}${topic.name}\n`,
        'Topics:\n');
    document.getElementById('content').innerText += topicsOutput;

    // populate input and labels for topics
    node = document.getElementById('topic-list')
    template = document.getElementById('topic-template')
    for (var i = 0; i < topics.length; i++) {
        clone = template.content.cloneNode(true);
        clone.querySelector(".material-list").id = `topic2-${topics[i].topicId}`;
        clone.querySelector(".topic-input").value = topics[i].topicId;
        clone.querySelector(".topic-input").id = `topic-${topics[i].topicId}`;
        clone.querySelector(".topic-label").htmlFor = `topic-${topics[i].topicId}`;
        clone.querySelector(".topic-label").textContent = `${topics[i].name}`;
        node.appendChild(clone);
    }
}

/**
 * Load materials using gapi.
 */
async function listMaterials(courseId) {
    /* read materials of a course */
    let materialsResponse;
    try {
        materialsResponse = await gapi.client.classroom.courses.courseWorkMaterials.list({
            courseId: `${courseId}`, // TODO change id into the one selected
            pageSize: 50,
        });
    } catch (err) {
        document.getElementById('content').innerText += err.message;
        return;
    }

    const materials = materialsResponse.result.courseWorkMaterial;
    if (!materials || materials.length == 0) {
        document.getElementById('content').innerText += 'No material found.';
        return;
    }
    console.log(materials);

    // Flatten to string to display
    const materialsOutput = materials.reduce(
        (str, material) => `${str}${material.title}\n`,
        'Materials:\n');
    document.getElementById('content').innerText += materialsOutput;

    // populate input and labels for materials
    // TODO: test for material which has no topic
    nodes = document.querySelectorAll('.material-list');
    console.log("debug nodes");
    console.log(nodes);
    for (let j = 0; j < nodes.length; j++) {
        node = nodes[j];
        template = document.getElementById('material-template')
        for (let i = 0; i < materials.length; i++) {
            if (`topic2-${materials[i].topicId}` === node.id) {
                clone = template.content.cloneNode(true);
                clone.querySelector(".material-input").value = materials[i].id;
                clone.querySelector(".material-input").id = `topic-${materials[i].id}`;
                clone.querySelector(".material-label").htmlFor = `topic-${materials[i].id}`;
                clone.querySelector(".material-label").textContent = `${materials[i].title}`;
                node.appendChild(clone);
            }
        }
    }
}
