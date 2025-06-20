import React, { useEffect, useState } from 'react';
import { Graph } from 'react-d3-graph'; // или используйте другую библиотеку для визуализации графов

const GraphView: React.FC = () => {
    const [data, setData] = useState({ nodes: [], links: [] });

    useEffect(() => {
        fetch('/api/graph') // Замените на ваш API для получения данных графа
            .then(response => response.json())
            .then(graphData => {
                setData(graphData);
            })
            .catch(error => {
                console.error('Ошибка при загрузке графа:', error);
            });
    }, []);

    const onClickNode = (nodeId: string) => {
        console.log(`Нажата нода: ${nodeId}`);
    };

    const onClickLink = (source: string, target: string) => {
        console.log(`Нажата связь между ${source} и ${target}`);
    };

    const graphConfig = {
        node: {
            color: 'lightblue',
            size: 200,
            highlightColor: 'blue',
            highlightStrokeColor: 'black',
        },
        link: {
            highlightColor: 'lightblue',
        },
    };

    return (
        <div>
            <h1>Визуализация графа</h1>
            <Graph
                id="graph-id"
                data={data}
                config={graphConfig}
                onClickNode={onClickNode}
                onClickLink={onClickLink}
            />
        </div>
    );
};

export default GraphView;