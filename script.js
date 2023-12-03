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

        let promise1 = courseLists["src-course-container"].load();
        let promise2 = courseLists["dst-course-container"].load();
        console.log("await promise1 src-courses")
        await promise1;
        console.log("await promise2 dst-courses")
        await promise2;
        console.log("awaits promise 1 and 2 done")
        //await Promise.all([promise1, promise2])
        courseLists["src-course-container"].show();
        courseLists["dst-course-container"].show();
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
 * Handles for user interaction
 */

async function handleSelectCourse(selectObject, container) {
    let courseId = selectObject.value;
    console.log(`user selected courseId ${courseId}`);
    console.log(selectObject);

    await materialLists[container].load(courseId);
    materialLists[container].show();
}

async function handleCheckTopic(selectObject) {
    // check/uncheck all materials in topic
    let topicItem = selectObject.closest('.topic-item');
    let topicId = topicItem.querySelector('.topic-id').textContent;
    let topicChecked = false;
    if (topicItem.querySelector('.topic-input:checked')) { topicChecked = true };

    materialLists["src-material-container"].selectAllInTopic(topicId, topicChecked);

    // adjust DOM of srcMaterials
    materialLists["src-material-container"].show();

    // adjust dstMaterials en DOM
    materialLists["dst-material-container"].add(materialLists["src-material-container"].selected()); // add maybe confusing as it removes previously added materials first, re-adding is what is actually does
    materialLists["dst-material-container"].show();
}

async function handleCheckMaterial(selectObject) {
    // check/uncheck material
    let materialItem = selectObject.closest('.material-item');
    let materialId = materialItem.querySelector('.material-id').textContent;
    let materialChecked = false;
    if (materialItem.querySelector('.material-input:checked')) { materialChecked = true };

    // update source material and dom
    materialLists["src-material-container"].select(materialId, materialChecked);
    materialLists["src-material-container"].show();
    
    // update destination data and dom
    console.log("selected materials")
    console.log(materialLists["src-material-container"].selected())
    materialLists["dst-material-container"].add(materialLists["src-material-container"].selected());
    materialLists["dst-material-container"].show();
}

/**
 *  Classes definitions
 */

class CourseList {
    constructor(selector) {
        this.selector = selector; // css selector for html container that contains course-list
        this.courses = [];
    }
    // method to load materials in course
    async load() {
        // retrieve courses from gapi
        //let response;
        let promise;
        try {
            promise = gapi.client.classroom.courses.list({
                pageSize: 10,
            });
        } catch (error) {
            console.log(error.message);
            return;
        }
        let response = await promise; // await reponse will make response undefined
        try {
            this.courses = response.result.courses;
        } catch (error) {
            console.log(error.message);
            console.log(this.courses);
            return;
        }
        return this.courses;
    }
    show() {
        let courseListElement = document.querySelector(`${this.selector} .course-list`)

        // remove old items from DOM
        let courseItems = courseListElement.querySelectorAll('.course-item');
        for (let courseItem of courseItems) {
            courseItem.remove();
        }

        // add new items to DOM
        let template = courseListElement.querySelector('.course-item-template');

        let clone = template.content.cloneNode(true);
        clone.querySelector("option").value = `kies`;
        clone.querySelector(".course-id").textContent = `classroom-id`;
        clone.querySelector(".course-name").textContent = `Kies je classroom`;
        courseListElement.appendChild(clone);

        for (let course of this.courses) {
            clone = template.content.cloneNode(true);
            clone.querySelector("option").value = `${course.id}`;
            clone.querySelector(".course-id").textContent = `${course.id}`;
            clone.querySelector(".course-name").textContent = `${course.name}`;
            courseListElement.appendChild(clone);
        }
    }
}

class MaterialList {
    constructor(selector) {
        this.selector = selector; // css selector
        this.materials = [];
    }
    // method to load materials in course
    async load(courseId) {
        // retrieve materiallist from gapi
        let materialPromise;
        try {
            materialPromise = gapi.client.classroom.courses.courseWorkMaterials.list({
                courseId: `${courseId}`,
                pageSize: 50,
            });
        } catch (error) {
            console.log(error.message);
            return;
        }

        // retrieve topics from gapi
        let topicPromise;
        try {
            topicPromise = gapi.client.classroom.courses.topics.list({
                courseId: `${courseId}`,
                pageSize: 10,
            });
        } catch (error) {
            console.log(error.message);
            return;
        }

        // wait untill data is retreived
        let materialResponse = await materialPromise;
        let topicResponse = await topicPromise;

        // copy retreived materials to class
        try {
            this.materials = materialResponse.result.courseWorkMaterial
        } catch (error) {
            console.log(error.message);
            console.log(materialResponse);
            return;
        }

        // copy retreived topics to temp variable
        let topics;
        try {
            topics = topicResponse.result.topic
        } catch (error) {
            console.log(error.message);
            console.log(topicResponse);
            return;
        }

        // add corresponding topic to each material
        if (this.materials.length > 0) {
            for (let [index, material] of this.materials.entries()) {
                this.materials[index] = Object.assign({},
                    topics.find(topic => topic.topicId === material.topicId),
                    material);
            }
        }

        return this.materials;
    }
    show() {
        console.log("show()");
        console.log(this.materials);

        let topicListElement = document.querySelector(`${this.selector} .topic-list`)

        // remove old topics and materials from DOM
        console.log(topicListElement);
        let topicItems = topicListElement.querySelectorAll('.topic-item');
        for (let topicItem of topicItems) {
            topicItem.remove();
        }

        // create list of unique topics from all materials
        let uniqueTopics = [];
        for (let material of this.materials) {
            if (!uniqueTopics.some(topic => topic.topicId === material.topicId)) {
                uniqueTopics.push(material)
            }
        }

        // add new topics to dom
        let templateTopicItem = topicListElement.querySelector('.topic-item-template');
        for (let topic of uniqueTopics) {
            // clone topic
            let cloneTopicItem = templateTopicItem.content.cloneNode(true);
            cloneTopicItem.querySelector(".topic-id").textContent = `${topic.topicId}`;
            cloneTopicItem.querySelector(".topic-name").textContent = `${topic.name}`;
            if (cloneTopicItem.querySelector(".material-input")) {
                // set check of topic according to underlying materials
                let cloneTopicInput = cloneTopicItem.querySelector(".topic-input")
                let materialCounted = this.materials.filter(material => material.topicId === topic.topicId).length;
                let materialsChecked = this.materials.filter(material => material.topicId === topic.topicId && material.checked === true).length;                
                if (materialsChecked > 0) {
                    cloneTopicInput.checked = true;
                } else {
                    cloneTopicInput.checked = false;
                }
                if (materialsChecked > 0 && materialsChecked < materialCounted) {
                    cloneTopicInput.indeterminate = true;
                } else {
                    cloneTopicInput.indeterminate = false;
                }
            }
            // add materials to cloned topic
            let materialListElement = cloneTopicItem.querySelector('.material-list');
            let templateMaterialItem = materialListElement.querySelector('.material-item-template');
            for (let material of this.materials.filter(material => material.topicId === topic.topicId)) {
                let cloneMaterialItem = templateMaterialItem.content.cloneNode(true);
                cloneMaterialItem.querySelector(".material-id").textContent = `${material.id}`;
                cloneMaterialItem.querySelector(".material-name").textContent = `${material.title}`;
                cloneMaterialItem.querySelector(".material-name").classList.add(material.status);
                if (cloneMaterialItem.querySelector(".material-input")) {
                    cloneMaterialItem.querySelector(".material-input").checked = material.checked;
                }
                materialListElement.appendChild(cloneMaterialItem);
            }
            // add cloned topic to dom
            topicListElement.appendChild(cloneTopicItem);
        }
    }
    selectAllInTopic(topicId, checked) {
        for (let material of this.materials) {
            if (material.topicId === topicId) {
                material.checked = checked;
            }
        }
    }
    select(id, checked) {
        for (let material of this.materials) {
            if (material.id === id) {
                material.checked = checked;
            }
        }
    }
    selected() {
        console.log("selected")
        console.log(this.materials.filter(material => material.checked === true))
        return this.materials.filter(material => material.checked === true)
    }
    add(srcMaterials) {
        // remove stuff

        // remove all dstMaterials with status "added" 
        this.materials = this.materials.filter(material => material.status !== "add");
        // remove status "update"
        for (let material of this.materials) {
            if (material.status === "update") {
                delete (material.status);
            }
        }

        // add stuff
        for (let srcMaterial of srcMaterials) {
            // update all dstMaterials with same title as srcMaterial
            while (this.materials.find(dstMaterial => dstMaterial.title === srcMaterial.title && dstMaterial.status === undefined)) {
                this.materials.find(dstMaterial => dstMaterial.title === srcMaterial.title && dstMaterial.status === undefined).status = "update";
            }
            // add if title of srcMaterial is not in any dstMaterial
            if (!this.materials.find(dstMaterial => dstMaterial.title === srcMaterial.title)) {
                srcMaterial.status = "add";
                this.materials.push(srcMaterial);
            }

        }
    }
}

/**
 *  Objects of classes (global)
 */

let courseLists = {
    "src-course-container": new CourseList('#src-course-container'),
    "dst-course-container": new CourseList('#dst-course-container')
}

let materialLists = {
    "src-material-container": new MaterialList('#src-material-container'),
    "dst-material-container": new MaterialList('#dst-material-container')
}
