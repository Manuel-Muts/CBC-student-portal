document.addEventListener('DOMContentLoaded', function() {
    const performanceChart = document.getElementById('performanceChart');
    const subjectChart = document.getElementById('subjectChart');
    const termFilter = document.getElementById('termFilter');
    const gradeFilter = document.getElementById('gradeFilter');

    let performanceCtx, subjectCtx;
    if (performanceChart) performanceCtx = performanceChart.getContext('2d');
    if (subjectChart) subjectCtx = subjectChart.getContext('2d');

    // Get student data
    const user = JSON.parse(localStorage.getItem('loggedInUser') || '{}');
    const marks = JSON.parse(localStorage.getItem('submittedMarks') || '[]')
        .filter(m => m.admissionNo === user.admission);

    function updateCharts(term = '', grade = '') {
        let filteredMarks = [...marks];
        
        if (term) {
            filteredMarks = filteredMarks.filter(m => m.term === term);
        }
        if (grade) {
            filteredMarks = filteredMarks.filter(m => m.grade === grade);
        }

        // Performance over time chart
        const termData = {};
        filteredMarks.forEach(mark => {
            if (!termData[mark.term]) {
                termData[mark.term] = {
                    scores: [],
                    average: 0
                };
            }
            termData[mark.term].scores.push(mark.score);
        });

        // Calculate averages
        Object.keys(termData).forEach(term => {
            const scores = termData[term].scores;
            termData[term].average = scores.reduce((a, b) => a + b, 0) / scores.length;
        });

        // Update performance chart
        if (performanceCtx) {
            if (window.performanceLineChart) {
                window.performanceLineChart.destroy();
            }

            window.performanceLineChart = new Chart(performanceCtx, {
                type: 'line',
                data: {
                    labels: Object.keys(termData),
                    datasets: [{
                        label: 'Term Average',
                        data: Object.values(termData).map(t => t.average),
                        borderColor: '#2980b9',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Performance Trend'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        }

        // Subject performance chart
        const subjectData = {};
        filteredMarks.forEach(mark => {
            if (!subjectData[mark.subject]) {
                subjectData[mark.subject] = {
                    scores: [],
                    average: 0
                };
            }
            subjectData[mark.subject].scores.push(mark.score);
        });

        Object.keys(subjectData).forEach(subject => {
            const scores = subjectData[subject].scores;
            subjectData[subject].average = scores.reduce((a, b) => a + b, 0) / scores.length;
        });

        if (subjectCtx) {
            if (window.subjectBarChart) {
                window.subjectBarChart.destroy();
            }

            window.subjectBarChart = new Chart(subjectCtx, {
                type: 'bar',
                data: {
                    labels: Object.keys(subjectData),
                    datasets: [{
                        label: 'Subject Average',
                        data: Object.values(subjectData).map(s => s.average),
                        backgroundColor: '#3498db'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Subject Performance'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100
                        }
                    }
                }
            });
        }
    }

    // Add filter event listeners
    termFilter?.addEventListener('change', () => {
        updateCharts(termFilter.value, gradeFilter.value);
    });

    gradeFilter?.addEventListener('change', () => {
        updateCharts(termFilter.value, gradeFilter.value);
    });

    // Initial chart render
    updateCharts();
});