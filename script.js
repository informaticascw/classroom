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
// readonly mode
// const SCOPES = 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.courseworkmaterials.readonly https://www.googleapis.com/auth/classroom.topics.readonly';
// readwrite mode
const SCOPES = 'https://www.googleapis.com/auth/classroom.courses.readonly https://www.googleapis.com/auth/classroom.courseworkmaterials https://www.googleapis.com/auth/classroom.topics';


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

        // this should be asynchronous, but it looks like gapi completes requests one by one
        let srcPromise = courseLists["src-course-container"].load();
        console.log("load src-courses done");
        let dstPromise = courseLists["dst-course-container"].load();
        console.log("load dst-courses done");
        await srcPromise;
        console.log("await promise src-courses done")
        courseLists["src-course-container"].show();
        await dstPromise;
        console.log("await promise dst-courses done")
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
    materialLists["dst-material-container"].add(materialLists["src-material-container"].selected());
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
    materialLists["dst-material-container"].add(materialLists["src-material-container"].selected());
    materialLists["dst-material-container"].show();

}

async function handleSaveClick(container) {
    materialLists[container].save();
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
        let promise;
        try {
            promise = gapi.client.classroom.courses.list({
                pageSize: 50,
            });
        } catch (error) {
            console.log(error.message);
            return;
        }
        let response = await promise;

        // store retreived courses in memory
        try {
            this.courses = response.result.courses.filter(course => course.courseState === "ACTIVE");
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
        if (this.materials ? this.materials.length > 0 : false) {
            for (let [index, material] of this.materials.entries()) {
                this.materials[index] = Object.assign({},
                    topics.find(topic => topic.topicId === material.topicId),
                    material);
            }
        }

        return this.materials;
    }
    // method to load materials in course
    async save() {
        // create topics that do not exist yet and store topicId's that gapi returns

        // create list of unique topics from all materials
        let uniqueTopics = [];
        console.log(`this.materials:\n${this.materials}`)
        if (this.materials ? this.materials.length > 0 : false) {
            for (let material of this.materials) {
                if (!uniqueTopics.some(topic => topic.topicId === material.topicId)) {
                    uniqueTopics.push(material);
                }
            }
        }
        // add all topics containing only materials with status "add" using gapi
        for (let topic of uniqueTopics) {
            if (!this.materials.some(material => material.topicId === topic.topicId && material.status !== "add")) {
                // add topic via gapi
                const pick = (obj, arr) => arr.reduce((acc, record) => (record in obj && (acc[record] = obj[record]), acc), {});
                let topicWrite = pick(topic, ['name']);
                let promise;
                try {
                    promise = gapi.client.classroom.courses.topics.create({
                        courseId: `${topic.courseId}`,
                        resource: `${JSON.stringify(topicWrite)}`,
                    });
                } catch (error) {
                    console.log(error.message);
                    return;
                }
                // wait untill topic is created and store topicId's that gapi returns
                // TODO: rewrite to make more async
                let response = await promise;
                console.log(`topicResponse:\n${response}`);
                // TODO: store topic
            }
        }

        // save materiallist to gapi
        let materialFull = this.materials.find(material => material.status === "add");

        const pick = (obj, arr) => arr.reduce((acc, record) => (record in obj && (acc[record] = obj[record]), acc), {});
        let materialSmall = pick(materialFull, ['title', 'description']); //, 'materials', 'topicId']);   

        console.log(`materialBeforeResponse:\n${JSON.stringify(materialSmall)}`)
        let materialPromise;
        try {
            materialPromise = gapi.client.classroom.courses.courseWorkMaterials.create({
                courseId: `${materialFull.courseId}`,
                resource: `${JSON.stringify(materialSmall)}`,
            });
        } catch (error) {
            console.log(error.message);
            return;
        }

        // wait untill data is retreived
        let materialResponse = await materialPromise;
        console.log(`materialResponse:\n${materialResponse}`)

        // delete materials to be removed via gapi

        // wait untill deletion is done

        // update materiallist
        this.load();
        this.add(materialLists["src-material-container"].selected());
        this.show();

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
        console.log(`this.materials:\n${this.materials}`)
        if (this.materials ? this.materials.length > 0 : false) {
            for (let material of this.materials) {
                if (!uniqueTopics.some(topic => topic.topicId === material.topicId)) {
                    uniqueTopics.push(material)
                }
            }
        }

        // add new topics to dom
        let templateTopicItem = topicListElement.querySelector('.topic-item-template');
        for (let topic of uniqueTopics) {
            // clone topic
            let cloneTopicItem = templateTopicItem.content.cloneNode(true);
            cloneTopicItem.querySelector(".topic-id").textContent = `${topic.topicId}`;
            cloneTopicItem.querySelector(".topic-name").textContent = `${topic.name}`;
            if (cloneTopicItem.querySelector(".topic-input")) {
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
        console.log(this.materials ? this.materials.filter(material => material.checked === true) : "this.materials undefined")
        return this.materials ? this.materials.filter(material => material.checked === true) : undefined;
    }
    add(srcMaterials) {
        if (this.materials ? this.materials.length > 0 : false) {
            // remove all dstMaterials with status "added" 
            this.materials = this.materials.filter(material => material.status !== "add");
            // delete status from all materials
            this.materials.forEach(material => delete (material.status));
        }

        // add materials
        if (srcMaterials) {
            for (let srcMaterial of srcMaterials) {
                let matchingMaterialAndTopic = this.materials && this.materials.length > 0 ? this.materials.find(dstMaterial => dstMaterial.title === srcMaterial.title && dstMaterial.name === srcMaterial.name) : undefined;
                let matchingTopic = this.materials && this.materials.length > 0 ? this.materials.find(dstMaterial => dstMaterial.name === srcMaterial.name) : undefined;

                let srcMaterialCopy = Object.assign({}, srcMaterial); // this is a shallow copy, TODO: make a deep copy to prevent unintended shared data between src and dst
                srcMaterialCopy.status = "add";
                try {
                    srcMaterialCopy.courseId = this.materials[0].courseId;
                }
                catch (error) {
                    console.log("TODO: support adding materials to empty course");
                }
                if (matchingMaterialAndTopic) { // add new and remove old in topic
                    srcMaterialCopy.topicId = matchingMaterialAndTopic.topicId;
                    matchingMaterialAndTopic.status = "remove";
                }
                if (!matchingMaterialAndTopic && matchingTopic) { // add new in existing topic
                    srcMaterialCopy.topicId = matchingTopic.topicId;
                }
                if (!matchingMaterialAndTopic && !matchingTopic) { // add new in new topic
                    srcMaterialCopy.topicId = srcMaterialCopy.topicId; // new topicId will be asigned by gapi
                }
                if (this.materials && this.materials.length > 0) {
                    this.materials.push(srcMaterialCopy);
                } else {
                    this.materials = srcMaterialCopy;
                }
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
