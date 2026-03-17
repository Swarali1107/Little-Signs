import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './ProfessionalDash.css';

const TASK_TYPES = [
  { value:'alphabet_practice',   label:'Alphabet Practice',    icon:'🔤' },
  { value:'number_practice',     label:'Number Practice',      icon:'🔢' },
  { value:'dictionary_explore',  label:'Dictionary Exploration',icon:'📖' },
  { value:'sentence_building',   label:'Sentence Building',    icon:'✍️' },
  { value:'weak_area_focus',     label:'Weak Area Focus',      icon:'🎯' },
  { value:'daily_revision',      label:'Daily Revision',       icon:'📅' },
  { value:'free_practice',       label:'Free Practice',        icon:'🕊️' },
];

export default function TeacherDashboard() {
  const { user, logout, authFetch } = useAuth();
  const navigate = useNavigate();

  const [students,  setStudents]  = useState([]);
  const [summary,   setSummary]   = useState(null);
  const [tasks,     setTasks]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('ls_tasks') || '[]'); } catch { return []; }
  });
  const [loading,   setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [addEmail,  setAddEmail]  = useState('');
  const [addMsg,    setAddMsg]    = useState(null);
  const [taskForm,  setTaskForm]  = useState({
    type:'alphabet_practice', title:'', description:'',
    assignTo:'all', studentId:'', dueDate:'', focus:'',
  });
  const [taskMsg,   setTaskMsg]   = useState(null);

  const loadData = () => {
    Promise.all([
      authFetch('/teacher/students').then(r => r.json()),
      authFetch('/teacher/class-summary').then(r => r.json()),
    ]).then(([s, sm]) => { setStudents(s); setSummary(sm); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadData(); }, []); // eslint-disable-line

  const addStudent = async (e) => {
    e.preventDefault(); setAddMsg(null);
    try {
      const res  = await authFetch('/teacher/add-student', {
        method:'POST', body: JSON.stringify({ email: addEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAddMsg({ ok:true, text: data.message });
      setAddEmail(''); loadData();
    } catch (err) { setAddMsg({ ok:false, text: err.message }); }
  };

  const removeStudent = async (lid, name) => {
    if (!window.confirm(`Remove ${name} from class?`)) return;
    await authFetch('/teacher/remove-student', {
      method:'DELETE', body: JSON.stringify({ learner_id: lid }),
    });
    loadData();
  };

  const assignTask = (e) => {
    e.preventDefault(); setTaskMsg(null);
    if (!taskForm.title.trim()) {
      setTaskMsg({ ok:false, text:'Please enter a task title' }); return;
    }
    const newTask = {
      id:          Date.now(),
      type:        taskForm.type,
      title:       taskForm.title,
      description: taskForm.description,
      assignTo:    taskForm.assignTo,
      studentId:   taskForm.studentId,
      studentName: taskForm.assignTo === 'all'
        ? 'All Students'
        : students.find(s => s.id === taskForm.studentId)?.name || 'Unknown',
      focus:       taskForm.focus,
      dueDate:     taskForm.dueDate,
      assignedAt:  new Date().toISOString(),
      status:      'active',
    };
    const updated = [newTask, ...tasks];
    setTasks(updated);
    localStorage.setItem('ls_tasks', JSON.stringify(updated));
    setTaskMsg({ ok:true, text:`Task "${newTask.title}" assigned!` });
    setTaskForm({ type:'alphabet_practice', title:'', description:'', assignTo:'all', studentId:'', dueDate:'', focus:'' });
  };

  const deleteTask = (id) => {
    const updated = tasks.filter(t => t.id !== id);
    setTasks(updated);
    localStorage.setItem('ls_tasks', JSON.stringify(updated));
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  // Compute class-wide feature stats
  const computeClassStats = () => {
    if (!summary) return {};
    return {
      alphaStudents:    students.filter(s => s.alpha_sessions > 0).length,
      numStudents:      students.filter(s => s.num_sessions > 0).length,
      dictStudents:     students.filter(s => s.dict_sessions > 0).length,
      sentStudents:     students.filter(s => s.sentence_sessions > 0).length,
    };
  };

  const cs = computeClassStats();
  const activeTasks = tasks.filter(t => t.status === 'active');

  if (loading) return <DashLoader />;

  return (
    <div className="pro-shell">
      {/* Sidebar */}
      <aside className="pro-sidebar">
        <div className="pro-brand">
          <span className="pro-brand-mark">🤟</span>
          <div>
            <div className="pro-brand-name">LittleSigns</div>
            <div className="pro-brand-role">Teacher Portal</div>
          </div>
        </div>

        <div className="pro-profile">
          <div className="pro-avatar" style={{ background:'linear-gradient(135deg,#4d79ff,#4BB543)' }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="pro-profile-name">{user?.name}</div>
            <div className="pro-profile-role">{summary?.class_name || 'My Class'}</div>
          </div>
        </div>

        <nav className="pro-nav">
          {[
            { key:'overview', icon:'📊', label:'Class Overview' },
            { key:'students', icon:'👥', label:'Students' },
            { key:'assign',   icon:'📋', label:'Assign Task' },
            { key:'tasks',    icon:'✅', label:`Tasks (${activeTasks.length})` },
            { key:'add',      icon:'➕', label:'Add Student' },
          ].map(item => (
            <button key={item.key}
              className={`pro-nav-btn ${activeTab === item.key ? 'active':''}`}
              onClick={() => setActiveTab(item.key)}>
              <span className="pro-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button className="pro-logout-btn" onClick={handleLogout}>
          <span>🚪</span> Sign Out
        </button>
      </aside>

      {/* Main */}
      <main className="pro-main">
        <div className="pro-topbar">
          <div>
            <h1 className="pro-page-title">
              {activeTab === 'overview' && `📊 ${summary?.class_name || 'Class'} Overview`}
              {activeTab === 'students' && '👥 Student Roster'}
              {activeTab === 'assign'   && '📋 Assign Task'}
              {activeTab === 'tasks'    && '✅ Task Board'}
              {activeTab === 'add'      && '➕ Add Student'}
            </h1>
            <p className="pro-page-sub">
              {activeTab === 'overview' && 'Alphabet · Numbers · Dictionary · Sentence Builder — all in one view'}
              {activeTab === 'students' && 'Individual progress across all 4 ISL learning features'}
              {activeTab === 'assign'   && 'Create tasks for any of the 4 learning features'}
              {activeTab === 'tasks'    && 'All assigned tasks and their details'}
              {activeTab === 'add'      && 'Enroll a student into your class'}
            </p>
          </div>
        </div>

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && (
          <div className="pro-body">
            {/* Top stats */}
            <div className="pro-stat-grid">
              <StatCard color="#6C63FF" icon="👥" label="Students"        value={summary?.total_students ?? 0} />
              <StatCard color="#ff4d9e" icon="📚" label="Total Sessions"   value={summary?.total_sessions ?? 0} />
              <StatCard color="#4d79ff" icon="🎯" label="Avg Accuracy"    value={`${summary?.class_accuracy ?? 0}%`} />
              <StatCard color="#ff8c4d" icon="📋" label="Active Tasks"    value={activeTasks.length} />
            </div>

            {/* Feature adoption */}
            <div className="pro-section-label">📱 Feature Adoption Across Class</div>
            <div className="pro-feat-breakdown">
              <FeatCard icon="🔤" title="Alphabet Detection"
                sessions={students.reduce((s,st) => s + (st.alpha_sessions||0), 0)}
                accuracy={summary?.class_accuracy || 0}
                color="#6C63FF"
                detail={`${cs.alphaStudents || 0} of ${students.length} students active`}
              />
              <FeatCard icon="🔢" title="Number Signs"
                sessions={students.reduce((s,st) => s + (st.num_sessions||0), 0)}
                accuracy={null}
                color="#ff8c4d"
                detail={`${cs.numStudents || 0} of ${students.length} students active`}
              />
              <FeatCard icon="📖" title="ISL Dictionary"
                sessions={students.reduce((s,st) => s + (st.dict_sessions||0), 0)}
                accuracy={null}
                color="#00e5ff"
                detail={`${cs.dictStudents || 0} of ${students.length} students exploring`}
              />
              <FeatCard icon="✍️" title="Sentence Builder"
                sessions={students.reduce((s,st) => s + (st.sentence_sessions||0), 0)}
                accuracy={null}
                color="#ff4d9e"
                detail={`${cs.sentStudents || 0} of ${students.length} students active`}
              />
            </div>

            <div className="pro-two-col">
              {/* Class weak spots */}
              <div className="pro-card">
                <div className="pro-card-header">
                  <span className="pro-card-icon err">⚠️</span>
                  <h3>Class Weak Spots</h3>
                </div>
                {summary?.hardest_letters?.length ? (
                  <>
                    <p style={{ fontSize:'0.8rem', color:'#888', marginBottom:'1rem' }}>
                      Letters with lowest class-wide accuracy
                    </p>
                    <div className="pro-hard-grid">
                      {summary.hardest_letters.map(l => (
                        <span key={l} className="pro-lbadge err">{l}</span>
                      ))}
                    </div>
                    <div className="pro-suggest-box">
                      💡 Consider assigning a <strong>Weak Area Focus</strong> task on these letters.
                      <button className="pro-quick-assign"
                        onClick={() => {
                          setTaskForm(f => ({
                            ...f,
                            type:'weak_area_focus',
                            title:`Focus: Weak letters ${summary.hardest_letters.join(', ')}`,
                            focus: summary.hardest_letters.join(', '),
                            assignTo:'all',
                          }));
                          setActiveTab('assign');
                        }}>
                        Auto-assign →
                      </button>
                    </div>
                  </>
                ) : <p className="pro-empty-txt">Not enough data yet</p>}
              </div>

              {/* Most practiced */}
              <div className="pro-card">
                <div className="pro-card-header">
                  <span className="pro-card-icon ok">🔤</span>
                  <h3>Most Practiced Letters</h3>
                </div>
                {summary?.top_letters?.length ? (
                  <div className="pro-bar-list">
                    {summary.top_letters.slice(0,6).map((t,i) => (
                      <div key={i} className="pro-bar-row">
                        <span className="pro-bar-letter ok">{t.letter}</span>
                        <div className="pro-bar-track">
                          <div className="pro-bar-fill ok"
                            style={{ width:`${Math.min(t.count/(summary.top_letters[0]?.count||1)*100,100)}%` }} />
                        </div>
                        <span className="pro-bar-pct" style={{ color:'#4BB543' }}>{t.count}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="pro-empty-txt">No data yet</p>}
              </div>
            </div>

            {/* Active tasks */}
            {activeTasks.length > 0 && (
              <div className="pro-card">
                <div className="pro-card-header">
                  <span className="pro-card-icon">📋</span>
                  <h3>Active Tasks</h3>
                  <button className="pro-btn-sm" onClick={() => setActiveTab('assign')}>➕ New</button>
                </div>
                <div className="pro-task-list">
                  {activeTasks.slice(0,3).map(task => (
                    <TaskPill key={task.id} task={task} onDelete={deleteTask} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── STUDENTS ── */}
        {activeTab === 'students' && (
          <div className="pro-body">
            {students.length === 0 ? (
              <div className="pro-empty-state">
                <div className="pro-empty-icon">👥</div>
                <h3>No students yet</h3>
                <button className="pro-btn-primary" onClick={() => setActiveTab('add')}>➕ Add First Student</button>
              </div>
            ) : (
              <div className="pro-card">
                <div className="pro-table-wrap">
                  <table className="pro-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Score</th>
                        <th>Accuracy</th>
                        <th>🔤 Alpha</th>
                        <th>🔢 Nums</th>
                        <th>📖 Dict</th>
                        <th>✍️ Sent</th>
                        <th>Last Active</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(s => (
                        <tr key={s.id}>
                          <td>
                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <div className="pro-avatar xs"
                                style={{ background:'linear-gradient(135deg,#4d79ff,#6C63FF)' }}>
                                {s.name[0].toUpperCase()}
                              </div>
                              <div>
                                <strong>{s.name}</strong>
                                <div style={{ fontSize:'0.72rem', color:'#888' }}>{s.email}</div>
                              </div>
                            </div>
                          </td>
                          <td><strong>⭐ {s.total_score}</strong></td>
                          <td>
                            <span className={`pro-result-badge ${s.accuracy>=70?'correct':s.accuracy>=40?'warn':'wrong'}`}>
                              {s.accuracy}%
                            </span>
                          </td>
                          <td className="pro-center">{s.alpha_sessions || 0}</td>
                          <td className="pro-center">{s.num_sessions || 0}</td>
                          <td className="pro-center">{s.dict_sessions || 0}</td>
                          <td className="pro-center">{s.sentence_sessions || 0}</td>
                          <td className="pro-date">
                            {s.last_active ? new Date(s.last_active).toLocaleDateString() : '—'}
                          </td>
                          <td>
                            <button className="pro-icon-btn" onClick={() => removeStudent(s.id, s.name)}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ASSIGN TASK ── */}
        {activeTab === 'assign' && (
          <div className="pro-body">
            <div className="pro-card" style={{ maxWidth:640 }}>
              <div className="pro-card-header">
                <span className="pro-card-icon tip">📋</span>
                <h3>Create & Assign Task</h3>
              </div>

              <form onSubmit={assignTask} className="pro-task-form">
                {/* Task type */}
                <div className="pro-form-field">
                  <label>Task Type</label>
                  <div className="pro-type-grid">
                    {TASK_TYPES.map(t => (
                      <button key={t.value} type="button"
                        className={`pro-type-btn ${taskForm.type === t.value ? 'active':''}`}
                        onClick={() => setTaskForm(f => ({ ...f, type:t.value }))}>
                        <span>{t.icon}</span>
                        <span>{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Title */}
                <div className="pro-form-field">
                  <label>Task Title *</label>
                  <input type="text" required placeholder="e.g. Practice letters A–E this week"
                    value={taskForm.title}
                    onChange={e => setTaskForm(f => ({ ...f, title:e.target.value }))}
                    className="pro-input" />
                </div>

                {/* Description */}
                <div className="pro-form-field">
                  <label>Instructions <span style={{ color:'#aaa', fontWeight:400 }}>(optional)</span></label>
                  <textarea placeholder="Describe what the student should do..."
                    value={taskForm.description}
                    onChange={e => setTaskForm(f => ({ ...f, description:e.target.value }))}
                    className="pro-textarea" rows={3} />
                </div>

                {/* Focus area */}
                <div className="pro-form-field">
                  <label>Focus <span style={{ color:'#aaa', fontWeight:400 }}>
                    {taskForm.type === 'alphabet_practice' || taskForm.type === 'weak_area_focus'
                      ? '(letters, e.g. A, B, C)' : taskForm.type === 'dictionary_explore'
                      ? '(words to look up)' : '(optional)'}
                  </span></label>
                  <input type="text"
                    placeholder={
                      taskForm.type === 'alphabet_practice' ? 'A, B, C, D, E' :
                      taskForm.type === 'dictionary_explore' ? 'water, food, school, family' :
                      taskForm.type === 'sentence_building' ? 'Try to spell your full name' :
                      'Optional focus area'}
                    value={taskForm.focus}
                    onChange={e => setTaskForm(f => ({ ...f, focus:e.target.value }))}
                    className="pro-input" />
                </div>

                <div className="pro-form-row">
                  {/* Assign to */}
                  <div className="pro-form-field">
                    <label>Assign To</label>
                    <select value={taskForm.assignTo}
                      onChange={e => setTaskForm(f => ({ ...f, assignTo:e.target.value, studentId:'' }))}
                      className="pro-select">
                      <option value="all">All Students</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Due date */}
                  <div className="pro-form-field">
                    <label>Due Date <span style={{ color:'#aaa', fontWeight:400 }}>(optional)</span></label>
                    <input type="date"
                      value={taskForm.dueDate}
                      onChange={e => setTaskForm(f => ({ ...f, dueDate:e.target.value }))}
                      className="pro-input"
                      min={new Date().toISOString().split('T')[0]} />
                  </div>
                </div>

                {taskMsg && (
                  <div className={`pro-msg ${taskMsg.ok ? 'ok':'err'}`}>
                    {taskMsg.ok ? '✅':'❌'} {taskMsg.text}
                  </div>
                )}

                <button type="submit" className="pro-btn-primary" style={{ width:'100%', marginTop:'0.5rem' }}>
                  📋 Assign Task
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ── TASKS BOARD ── */}
        {activeTab === 'tasks' && (
          <div className="pro-body">
            {tasks.length === 0 ? (
              <div className="pro-empty-state">
                <div className="pro-empty-icon">📋</div>
                <h3>No tasks assigned yet</h3>
                <button className="pro-btn-primary" onClick={() => setActiveTab('assign')}>➕ Assign First Task</button>
              </div>
            ) : (
              <div className="pro-card">
                <div className="pro-card-header">
                  <span className="pro-card-icon">📋</span>
                  <h3>All Tasks ({tasks.length})</h3>
                  <button className="pro-btn-sm" onClick={() => setActiveTab('assign')}>➕ New Task</button>
                </div>
                <div className="pro-task-list full">
                  {tasks.map(task => (
                    <TaskPill key={task.id} task={task} onDelete={deleteTask} full />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── ADD STUDENT ── */}
        {activeTab === 'add' && (
          <div className="pro-body">
            <div className="pro-card" style={{ maxWidth:500 }}>
              <div className="pro-card-header">
                <span className="pro-card-icon">➕</span>
                <h3>Enroll a Student</h3>
              </div>
              <p className="pro-form-desc">Enter the student's registered email to add them to your class.</p>
              <form onSubmit={addStudent} className="pro-form">
                <input type="email" required placeholder="student@example.com"
                  value={addEmail} onChange={e => setAddEmail(e.target.value)}
                  className="pro-input" />
                <button type="submit" className="pro-btn-primary">Add to Class</button>
              </form>
              {addMsg && (
                <div className={`pro-msg ${addMsg.ok ? 'ok':'err'}`}>
                  {addMsg.ok ? '✅':'❌'} {addMsg.text}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function TaskPill({ task, onDelete, full }) {
  const typeInfo = TASK_TYPES.find(t => t.value === task.type) || { icon:'📋', label:task.type };
  return (
    <div className={`pro-task-card ${full ? 'full':''}`}>
      <div className="pro-task-left">
        <span className="pro-task-type-icon">{typeInfo.icon}</span>
        <div>
          <div className="pro-task-title">{task.title}</div>
          <div className="pro-task-meta">
            <span>👤 {task.studentName}</span>
            {task.focus && <span>🎯 {task.focus}</span>}
            {task.dueDate && <span>📅 Due {new Date(task.dueDate).toLocaleDateString()}</span>}
            <span className="pro-task-date">Assigned {new Date(task.assignedAt).toLocaleDateString()}</span>
          </div>
          {full && task.description && <p className="pro-task-desc">{task.description}</p>}
        </div>
      </div>
      <button className="pro-icon-btn" onClick={() => onDelete(task.id)}>🗑️</button>
    </div>
  );
}

function FeatCard({ icon, title, sessions, accuracy, color, detail }) {
  return (
    <div className="pro-feat-card" style={{ '--fc': color }}>
      <div className="pro-feat-icon" style={{ background: color }}>{icon}</div>
      <div className="pro-feat-info">
        <div className="pro-feat-title">{title}</div>
        <div className="pro-feat-sessions">{sessions} sessions</div>
        {accuracy !== null && (
          <div className="pro-feat-acc" style={{ color: accuracy>=70?'#4BB543':accuracy>=40?'#FFC107':'#F44336' }}>
            {accuracy}% accuracy
          </div>
        )}
        <div className="pro-feat-detail">{detail}</div>
      </div>
      <div className="pro-feat-bar">
        <div className="pro-feat-fill" style={{ height:`${Math.min(sessions*5,100)}%`, background:color }} />
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="pro-stat-card" style={{ '--accent': color }}>
      <div className="pro-stat-icon" style={{ background: color }}>{icon}</div>
      <div>
        <div className="pro-stat-value">{value}</div>
        <div className="pro-stat-label">{label}</div>
      </div>
    </div>
  );
}

function DashLoader() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#f5f7fa' }}>
      <div style={{ textAlign:'center' }}>
        <div className="pro-spinner" style={{ margin:'0 auto 1rem' }} />
        <p style={{ color:'#6C63FF', fontWeight:600 }}>Loading...</p>
      </div>
    </div>
  );
}
