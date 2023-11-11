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
        await listDestCourses();
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
    var courseId = selectObject.value;
    console.log(`user selected courseId ${courseId}`);
    await listTopics(courseId);
    await listMaterials(courseId);
}

async function handleSelectDestCourse(selectObject) {
    var courseId = selectObject.value;
    console.log(`user selected destination courseId ${courseId}`);
    await listDestTopics(courseId);
    await listDestMaterials(courseId);
}

async function handleCheckTopic(selectObject) {
    console.log(selectObject)
    let topicItem = selectObject.parentNode
    console.log(topicItem)
    let topicParent = topicItem.parentNode
    console.log(topicParent)
    let materialInputs = topicItem.querySelectorAll(':scope > ul.material-list > li.material-item >input.material-input');
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

    // populate select-tag with course-names, remove old item in list
    node = document.getElementById('course-list')
    while (node.querySelector('.course-item')) {
        node.removeChild(node.querySelector('.course-item'));
    }
    template = document.getElementById('course-item-template')

    for (let course of courses) {
        clone = template.content.cloneNode(true);
        clone.querySelector(".course-item").value = course.id;
        clone.querySelector(".course-item").textContent = `${course.name}`;
        node.appendChild(clone);
    }
}

async function listDestCourses() {
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
        'Destination courses:\n');
    document.getElementById('content').innerText += output;

    // populate select-tag with course-names, remove old item in list
    node = document.getElementById('dest-course-list')
    while (node.querySelector('.course-item')) {
        node.removeChild(node.querySelector('.course-item'));
    }
    template = document.getElementById('dest-course-item-template')

    for (let course of courses) {
        clone = template.content.cloneNode(true);
        clone.querySelector(".course-item").value = course.id;
        clone.querySelector(".course-item").textContent = `${course.name}`;
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

    // populate input and labels for topics, and remove old items in list
    node = document.getElementById('topic-list');
    while (node.querySelector('.topic-item')) {
        node.removeChild(node.querySelector('.topic-item')); // TODO: maybe this becomes more flexible using .firstChild
    }
    template = document.getElementById('topic-template')
    for (let topic of topics) {
        clone = template.content.cloneNode(true);
        clone.querySelector(".material-list").id = `topic2-${topic.topicId}`;
        clone.querySelector(".topic-input").value = topic.topicId;
        clone.querySelector(".topic-input").id = `topic-${topic.topicId}`;
        clone.querySelector(".topic-label").htmlFor = `topic-${topic.topicId}`;
        clone.querySelector(".topic-label").textContent = `${topic.name}`;
        node.appendChild(clone);
    }
}

async function listDestTopics(courseId) {
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
        'Destination topics:\n');
    document.getElementById('content').innerText += topicsOutput;

    // populate input and labels for topics, and remove old items in list
    node = document.getElementById('dest-topic-list');
    while (node.querySelector('.dest-topic-item')) {
        node.removeChild(node.firstChild); 
    }
    template = document.getElementById('dest-topic-template')
    for (let topic of topics) {
        clone = template.content.cloneNode(true);
        clone.querySelector(".dest-material-list").id = `dest-topic2-${topic.topicId}`;
        clone.querySelector(".dest-topic-item").id = `dest-topic-${topic.topicId}`;
        clone.querySelector(".dest-topic-item").textContent = `${topic.name}`;
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

    // populate input and labels for materials, and remove old items in list
    // TODO: test for material which has no topic
    nodes = document.querySelectorAll('.material-list');
    for (let node of nodes) {
        while (node.querySelector('.material-item')) {
            node.removeChild(node.querySelector('.material-item'));
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

async function listDestMaterials(courseId) {
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
        'Destination materials:\n');
    document.getElementById('content').innerText += materialsOutput;

    // populate input and labels for materials, and remove old items in list
    // TODO: test for material which has no topic
    nodes = document.querySelectorAll('.dest-material-list');
    for (let node of nodes) {
        while (node.querySelector('.dest-material-item')) { //CHECK:list ipv item?
            node.removeChild(node.querySelector('.dest-material-item'));
        }
        template = document.getElementById('dest-material-template')
        for (let material of materials) {
            if (`dest-topic2-${material.topicId}` === node.id) {
                clone = template.content.cloneNode(true);
                clone.querySelector(".dest-material-item").id = `${material.id}`;
                clone.querySelector(".dest-material-item").textContent = `${material.title}`;
                node.appendChild(clone);
            }
        }
    }
}
