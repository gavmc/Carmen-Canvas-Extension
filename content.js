let observer = null;
let currentTab = 'all'; 

// --- Initialization ---
const init = () => {
    fixToDo();
    showGrades();
}

function waitForPageLoad() {
    return new Promise((resolve) => {
        if (document.readyState === 'complete') {
            resolve();
        } else {
            window.addEventListener('load', resolve);
        }
    });
}

waitForPageLoad().then(() => {
    setTimeout(init, 1000);
});


// --- Dashboard Grade Badges ---

const showGrades = async () => {
    try {
        const response = await fetch('/api/v1/users/self/enrollments?type[]=StudentEnrollment&state[]=active');
        if (!response.ok) throw new Error('Failed to fetch grades');
        
        const enrollments = await response.json();
        const gradeMap = {};
        
        enrollments.forEach(enrollment => {
            if (enrollment.course_id && enrollment.grades) {
                const score = enrollment.grades.current_score;
                if (score !== null && score !== undefined) {
                    gradeMap[enrollment.course_id] = score;
                }
            }
        });

        applyGradesToCards(gradeMap);

    } catch (e) {
        console.error("Canvas++: Error fetching grades", e);
    }
}

const applyGradesToCards = (gradeMap) => {
    const cards = document.querySelectorAll('.ic-DashboardCard');
    
    cards.forEach(card => {
        const link = card.querySelector('a.ic-DashboardCard__link');
        if (!link) return;

        const href = link.getAttribute('href');
        const match = href.match(/\/courses\/(\d+)/);
        
        if (match) {
            const courseId = match[1];
            const grade = gradeMap[courseId];

            if (grade !== undefined && !card.querySelector('.canvas-pp-grade-badge')) {
                // Create a Link instead of just a div
                const badge = document.createElement('a');
                badge.className = 'canvas-pp-grade-badge';
                badge.innerText = `${grade}%`;
                badge.href = `/courses/${courseId}/grades`; // Direct link to grades
                
                // Determine Color Class
                if (grade >= 90) badge.classList.add('grade-a');
                else if (grade >= 80) badge.classList.add('grade-b');
                else if (grade >= 70) badge.classList.add('grade-c');
                else if (grade >= 60) badge.classList.add('grade-d');
                else badge.classList.add('grade-f');

                const header = card.querySelector('.ic-DashboardCard__header');
                if (header) {
                    header.style.position = 'relative'; 
                    header.appendChild(badge);
                }
            }
        }
    });
}


// --- ToDo Sidebar Logic (Existing) ---

const fixToDo = () => {
    const rightSide = document.querySelector("#right-side");
    if (!rightSide) return;

    const logo = rightSide.querySelector(".ic-sidebar-logo");
    if (logo) {
        logo.style.display = 'none'; 
    }

    const toDoContainer = rightSide.querySelector('[data-testid="ToDoSidebar"]');
    
    if (toDoContainer) {
        startObserver(toDoContainer);
        replaceToDo(toDoContainer);
    }
}

const startObserver = (container) => {
    if (observer) observer.disconnect();

    observer = new MutationObserver((mutations) => {
        const isInternal = mutations.every(m => 
            m.target.id === 'canvas-pp-todo-container' || 
            m.target.closest('#canvas-pp-todo-container')
        );

        if (!isInternal) {
            replaceToDo(container);
        }
    });
    
    observer.observe(container, { childList: true, subtree: true });
}

const replaceToDo = (toDoContainer) => {
    if (observer) observer.disconnect();

    try {
        const existingList = toDoContainer.querySelector('ul');
        if (!existingList) return;

        const itemsRaw = existingList.querySelectorAll('li');
        const itemsData = Array.from(itemsRaw).map(item => extractItemData(item)).filter(i => i);

        let customContainer = document.getElementById('canvas-pp-todo-container');
        if (!customContainer) {
            customContainer = document.createElement('div');
            customContainer.id = 'canvas-pp-todo-container';
            toDoContainer.appendChild(customContainer);
        } else {
            customContainer.innerHTML = '';
        }

        Array.from(toDoContainer.children).forEach(child => {
            if (child.id !== 'canvas-pp-todo-container') {
                child.style.display = 'none';
            }
        });

        renderHeader(customContainer, itemsData);
        renderTabs(customContainer);
        renderList(customContainer, itemsData);

    } catch (err) {
        console.error("Canvas++ Error:", err);
    } finally {
        if (observer) observer.observe(toDoContainer, { childList: true, subtree: true });
    }
}

// --- Rendering Functions ---

const renderHeader = (container, items) => {
    const html = `
        <div class="pp-header">
            <div class="pp-header-top">
                <span class="pp-header-title">Tasks</span>
                <span class="pp-header-date">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
        </div>
    `;
    
    const div = document.createElement('div');
    div.innerHTML = html;
    container.appendChild(div);
}

const renderTabs = (container) => {
    const tabs = document.createElement('div');
    tabs.className = 'pp-tabs';
    
    const createTab = (id, icon, type) => {
        const btn = document.createElement('button');
        btn.className = `pp-tab ${currentTab === type ? 'active' : ''}`;
        btn.innerHTML = icon;
        btn.onclick = () => {
            currentTab = type;
            const toDoContainer = document.querySelector('[data-testid="ToDoSidebar"]');
            replaceToDo(toDoContainer);
        };
        return btn;
    };

    const iconAll = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
    const iconAssign = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
    const iconAnnounce = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>`;

    tabs.appendChild(createTab('tab-all', iconAll, 'all'));
    tabs.appendChild(createTab('tab-assign', iconAssign, 'Assignment'));
    tabs.appendChild(createTab('tab-announce', iconAnnounce, 'Announcement'));

    container.appendChild(tabs);
}

const renderList = (container, items) => {
    const listContainer = document.createElement('div');
    listContainer.className = 'pp-list-container';

    let filteredItems = items;
    if (currentTab !== 'all') {
        filteredItems = items.filter(i => i.type === currentTab);
    }

    const groups = {
        'Overdue': [],
        'Today': [],
        'Tomorrow': [],
        'Upcoming': []
    };

    // Time Boundaries
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    const nextStart = new Date(tomorrowStart);
    nextStart.setDate(nextStart.getDate() + 1);

    filteredItems.forEach(item => {
        const itemDate = parseCanvasDate(item.date);
        
        if (!itemDate) {
            groups['Upcoming'].push(item);
            return;
        }

        if (itemDate < todayStart) {
            groups['Overdue'].push(item);
        } else if (itemDate >= todayStart && itemDate < tomorrowStart) {
            groups['Today'].push(item);
        } else if (itemDate >= tomorrowStart && itemDate < nextStart) {
            groups['Tomorrow'].push(item);
        } else {
            groups['Upcoming'].push(item);
        }
    });

    const renderGroup = (name, list, isOverdue = false) => {
        if (list.length > 0) {
            const groupHeader = document.createElement('h3');
            groupHeader.className = 'pp-group-header';
            if (isOverdue) groupHeader.classList.add('overdue-header');
            groupHeader.innerText = isOverdue ? 'Overdue' : `due ${name}`;
            listContainer.appendChild(groupHeader);

            list.forEach(item => {
                listContainer.appendChild(createCard(item));
            });
        }
    };

    renderGroup('Overdue', groups['Overdue'], true);
    renderGroup('Today', groups['Today']);
    renderGroup('Tomorrow', groups['Tomorrow']);
    renderGroup('Upcoming', groups['Upcoming']);

    container.appendChild(listContainer);
}

const createCard = (data) => {
    const card = document.createElement('div');
    card.className = `pp-card type-${data.type.toLowerCase()}`;

    const icons = {
        "Announcement": `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>`,
        "Assignment": `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>`,
        "Quiz": `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
        "Task": `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
    };

    const html = `
        <div class="pp-card-icon-box">
            ${icons[data.type] || icons['Task']}
        </div>
        <div class="pp-card-content">
            <div class="pp-card-course">${cleanCourseName(data.course)}</div>
            <a href="${data.url}" class="pp-card-title">${data.title}</a>
            <div class="pp-card-meta">
                Due ${data.date} ${data.points ? `| ${data.points}` : ''}
            </div>
        </div>
        <div class="pp-card-actions">
             <button class="pp-card-dismiss" aria-label="Dismiss">✕</button>
        </div>
    `;

    card.innerHTML = html;

    const newDismissBtn = card.querySelector('.pp-card-dismiss');
    newDismissBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        card.style.transform = 'translateX(100%)';
        card.style.opacity = '0';
        
        setTimeout(() => {
            if (data.originalDismissBtn) {
                data.originalDismissBtn.click();
            }
        }, 300);
    });

    return card;
}

// --- Helpers ---

const parseCanvasDate = (dateStr) => {
    if (!dateStr) return null;
    
    let cleanStr = dateStr
        .replace(/\b(at|due)\b/gi, '') 
        .replace(/,/g, '') 
        .replace(/[\s\u00A0]+/g, ' ') 
        .trim();

    const now = new Date();

    // Handle Keywords
    if (cleanStr.toLowerCase().includes('tomorrow')) {
        const d = new Date(now);
        d.setDate(d.getDate() + 1);
        const timeMatch = cleanStr.match(/\d{1,2}:\d{2}(?:am|pm)?/i);
        if (timeMatch) {
            return new Date(`${d.toDateString()} ${timeMatch[0]}`);
        }
        return d;
    }

    if (cleanStr.toLowerCase().includes('today')) {
        const timeMatch = cleanStr.match(/\d{1,2}:\d{2}(?:am|pm)?/i);
        if (timeMatch) {
            return new Date(`${now.toDateString()} ${timeMatch[0]}`);
        }
        return now;
    }

    const currentYear = now.getFullYear();
    const match = cleanStr.match(/^([A-Za-z]+)\s+(\d+)\s*(.*)$/);
    
    if (match) {
        const [_, month, day, timeRaw] = match;
        let time = timeRaw.trim();
        time = time.replace(/(\d)(am|pm)/i, '$1 $2');

        const dateString = `${month} ${day}, ${currentYear} ${time}`;
        let parsed = new Date(dateString);

        if (!isNaN(parsed.getTime())) {
            const diff = now - parsed;
            const fourMonths = 1000 * 60 * 60 * 24 * 120; 
            if (diff > fourMonths) {
                parsed.setFullYear(parsed.getFullYear() + 1);
            }
            return parsed;
        }
    }

    return null;
}

const extractItemData = (item) => {
    try {
        const titleAnchor = item.querySelector('[data-testid="todo-sidebar-item-title"] a');
        const metaSpan = item.querySelector('[data-testid="todo-sidebar-item-info"] > span');
        const infoItems = item.querySelectorAll('[data-testid="ToDoSidebarItem__InformationRow"] li');
        const iconSvg = item.querySelector('svg');
        const dismissBtn = item.querySelector('button');

        if (!titleAnchor) return null;

        let type = "Task";
        if (iconSvg) {
            const name = iconSvg.getAttribute('name');
            if (name && name.includes('Announcement')) type = "Announcement";
            else if (name && name.includes('Assignment')) type = "Assignment";
            else if (name && name.includes('Quiz')) type = "Quiz";
        }

        let date = "";
        let points = "";

        infoItems.forEach(li => {
            const text = li.textContent.trim();
            if (text.includes('points')) {
                points = text;
            } else {
                date = text;
            }
        });

        return {
            title: titleAnchor.textContent.trim(),
            url: titleAnchor.href,
            course: metaSpan ? metaSpan.textContent.trim() : "General",
            date: date,
            points: points,
            type: type,
            originalDismissBtn: dismissBtn
        };
    } catch (e) {
        return null;
    }
}

const cleanCourseName = (name) => {
    if (!name) return "";
    return name.replace(/^[A-Z]{2}\d{2}\s+/, '').split('-')[0].trim();
}