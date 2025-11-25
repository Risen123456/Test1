// 对话记忆系统
class MemorySystem {
  constructor(memoryKey = "conversationMemory") {
    this.memoryKey = memoryKey;
    this.conversationHistory = this.loadMemory();
  }
  
  loadMemory() {
    /* 加载历史记忆 */
    try {
      const savedMemory = localStorage.getItem(this.memoryKey);
      return savedMemory ? JSON.parse(savedMemory) : [];
    } catch (error) {
      console.error("加载记忆失败:", error);
      return [];
    }
  }
  
  saveMemory() {
    /* 保存记忆到localStorage */
    try {
      localStorage.setItem(this.memoryKey, JSON.stringify(this.conversationHistory));
    } catch (error) {
      console.error("保存记忆失败:", error);
    }
  }
  
  addInteraction(question, answer, reflection = null) {
    /* 添加交互记录 */
    const interaction = {
      timestamp: new Date().toISOString(),
      question: question,
      answer: answer,
      reflection: reflection,
      learned_concepts: this.extractConcepts(question)
    };
    this.conversationHistory.push(interaction);
    this.saveMemory();
  }
  
  extractConcepts(question) {
    /* 从对话中提取关键概念 */
    const concepts = [];
    // 简单关键词提取（可扩展为更复杂的NLP处理）
    const keywords = ["如何", "为什么", "方法", "步骤", "概念", "原理"];
    for (const keyword of keywords) {
      if (question.toLowerCase().includes(keyword)) {
        concepts.push(keyword);
      }
    }
    return concepts;
  }
  
  getRelevantMemory(currentQuestion, top_k = 3) {
    /* 获取相关的历史记忆 */
    if (!this.conversationHistory.length) {
      return [];
    }
    
    // 简单基于关键词的相似度匹配
    const relevant = [];
    // 只考虑最近10条记录
    const recentHistory = this.conversationHistory.slice(-10);
    
    for (const memory of recentHistory) {
      const simScore = this.calculateSimilarity(currentQuestion, memory.question);
      if (simScore > 0.3) { // 相似度阈值
        relevant.push({ ...memory, similarity: simScore });
      }
    }
    
    // 按相似度排序并返回top_k条
    return relevant
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, top_k)
      // eslint-disable-next-line no-unused-vars
      .map(({ similarity, ...memory }) => memory);
  }
  
  calculateSimilarity(text1, text2) {
    /* 计算文本相似度（简化版） */
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    const common = [...words1].filter(word => words2.has(word));
    return common.length / Math.max(words1.size, words2.size);
  }
}

// 自我反思学习系统
class SelfLearningAPI {
  constructor(apiClient, memorySystem) {
    this.apiClient = apiClient;
    this.memory = memorySystem;
  }
  
  async learnFromInteraction(question, originalAnswer, apiKey) {
    /* 从交互中学习 */
    try {
      // 反思和改进
      const reflectionPrompt = `
基于之前的对话和回答，请进行自我反思：

原始问题：${question}
我的回答：${originalAnswer}

请思考：
1. 这个回答有哪些可以改进的地方？
2. 有没有遗漏的重要信息？
3. 如何让回答更加准确和有用？
4. 从这个交互中学到了什么？

反思和改进建议：
`;
      
      const response = await this.apiClient.post(
        'https://api.deepseek.com/v1/chat/completions',
        {
          model: 'deepseek-chat',
          messages: [{ role: 'user', content: reflectionPrompt }],
          temperature: 0.4,
          max_tokens: 1000
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const reflection = response.data.choices[0].message.content;
      
      // 保存学习结果
      this.memory.addInteraction(question, originalAnswer, reflection);
      return reflection;
    } catch (error) {
      console.error("自我反思学习失败:", error);
      return null;
    }
  }
}

export { MemorySystem, SelfLearningAPI };