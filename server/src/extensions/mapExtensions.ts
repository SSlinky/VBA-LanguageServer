interface Map<K, V> {
	/**
	 * Returns a specified element from the Map object. If the value that is associated to the provided key is an object,
	 * then you will get a reference to that object and any change made to that object will effectively modify it inside the Map.
	 * @returns Returns the element associated with the specified key. If no element is associated with the specified key, it is created first.
	 */
	getOrCreate<K, V>(key: K, factory: () => V): V;
}

Map.prototype.getOrCreate = function <K, V>(this: Map<K, V>, key: K, factory: () => V): V {
	if (!this.has(key)) {
		this.set(key, factory());
	}
	return this.get(key)!;
};
