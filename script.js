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

        await listCourses(document.querySelector('#src-course-container .course-list'));
        await listCourses(document.querySelector('#dst-course-container .course-list'));
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

async function handleSelectCourse(selectObject) {
    let courseItem = selectObject.closest('.course-item');
    let courseId = courseItem.querySelector('.course-id');
    console.log(`user selected courseId ${courseId}`);
    let topicListElement = selectObject.closest('.topic-list')
    await listTopicsAndMaterials(topicListElement, courseId);
}

async function handleCheckTopic(selectObject) {
    let materialList = selectObject.closest('.material-list');
    let materialInputs = materialList.querySelectorAll('.material-input');
    for (let materialInput of materialInputs) {
        materialInput.checked = selectObject.checked
    }
}

async function handleCheckMaterial(selectObject) {
    let topicItem = selectObject.closest('.topic-item');
    let topicInput = topicItem.querySelector('.topic-input');
    let materialInputs = topicItem.querySelectorAll('.material-input');
    let materialCounted = materialInputs.length
    let materialChecks = topicItem.querySelectorAll('.material-input:checked');
    let materialChecked = materialChecks.length
    if (materialChecked > 0) {
        topicInput.checked = true;
    } else {
        topicInput.checked = false;
    }
    if (materialChecked > 0 && materialChecked < materialCounted) {
        topicInput.indeterminate = true;
    } else {
        topicInput.indeterminate = false;
    }
}

/**
 * Load courses using gapi.
 */
async function listCourses(courseListElement) {
    // retrieve courses from gapi
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

    // remove old items from DOM
    let courseItems = courseListElement.querySelectorAll('.course-item');
    for (let courseItem of courseItems) {
        courseItem.remove();
    }

    // add new items to DOM
    let template = courseListElement.querySelector('.course-item-template');

    let clone = template.content.cloneNode(true);
    clone.querySelector(".course-id").textContent = `classroom-id`;
    clone.querySelector(".course-name").textContent = `Kies je classroom`;
    courseListElement.appendChild(clone);

    for (let course of courses) {
        clone = template.content.cloneNode(true);
        clone.querySelector(".course-id").textContent = `${course.id}`;
        clone.querySelector(".course-name").textContent = `${course.name}`;
        courseListElement.appendChild(clone);
    }
}

/**
 * Load topics and materials using gapi.
 */
async function listTopicsAndMatrials(topicListElement, courseId) {
    // retrieve topics from gapi
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

    // remove old topics from DOM
    let topicItems = topicListElement.querySelectorAll('.topic-item');
    for (let topicItem of topicItems) {
        topicItem.remove();
    }

    // add new topics to DOM
    let template = topicListElement.querySelector('.topic-item-template');

    for (let topic of topics) {
        clone = template.content.cloneNode(true);
        clone.querySelector(".topic-id").textContent = `${topic.topicId}`;
        clone.querySelector(".topic-name").textContent = `${topic.name}`;
        topicListElement.appendChild(clone);
    }

    // retrieve materials from gapi
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
    //start
    // remove old topics from DOM
    let topicItems = topicListElement.querySelectorAll('.topic-item');
    for (let topicItem of topicItems) {
        topicItem.remove();
    }

    // add new topics to DOM
    let template = topicListElement.querySelector('.topic-item-template');

    for (let topic of topics) {
        clone = template.content.cloneNode(true);
        clone.querySelector(".topic-id").textContent = `${topic.topicId}`;
        clone.querySelector(".topic-name").textContent = `${topic.name}`;
        topicListElement.appendChild(clone);
    }
    //end

    // add materials for each topic
    // TODO: test for material which has no topic
    let materialLists = topicListElement.querySelectorAll('.material-list');
    for (let materialList of materialLists) {

        // remove old material-items from topic in DOM
        let materialItems = materialList.querySelectorAll('.material-item');
        for (let materialItem of materialItems) {
            materialItem.remove();
        }

        template = document.getElementById('material-template')
        for (let material of materials) {
            if (`topic2-${material.topicId}` === node.id) {
                clone = template.content.cloneNode(true);
                clone.querySelector(".material-input").value = material.id;
                clone.querySelector(".material-input").id = `topic-${material.id}`;
                clone.querySelector(".material-label").htmlFor = `topic-${material.id}`;
                clone.querySelector(".material-label").textContent = `${material.title}`;
                node.appendChild(clone);
            }
        }
    }
}

